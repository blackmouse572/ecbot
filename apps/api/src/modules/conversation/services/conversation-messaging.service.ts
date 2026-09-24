import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { text as toText } from '@app/modules/platform/interfaces/message-model';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { ToolInvocationEntity } from '@app/modules/tool/repository/entities/tool-invocation.entity';
import { ToolInvocationRepository } from '@app/modules/tool/repository/repositories/tool-invocation.repository';
import { ENUM_TOOL_INVOCATION_STATUS } from '@app/modules/tool/enums/tool-invocation-status.enum';
import { UserRepository } from '@app/modules/user/repository/repositories/user.repository';
import {
    Injectable,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidV4 } from 'uuid';
import {
    MessageGetResponseDto,
    ToolCallSerialization,
} from '../dtos/response/message.get.response.dto';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_STATUS,
} from '../enums/message.enum';
import { ConversationEntity } from '../repository/entities/conversation.entity';
import { MessageEntity } from '../repository/entities/message.entity';
import { ConversationRepository } from '../repository/repositories/conversation.repository';
import { MessageRepository } from '../repository/repositories/message.repository';

/**
 * Dispatches operator-initiated messages to the customer's platform via the
 * PlatformAdapterRegistry. The registry resolves the correct PlatformAdapter
 * from account.type — each adapter wraps platform-specific HTTP calls behind
 * flat sendMessage / fetchSenderProfile / markRead / startTyping methods.
 */
/**
 * users.id is a uuid column; author ids that are not uuids belong to other
 * systems (a platform page id on an imported message) and must be filtered
 * out before any lookup against it.
 */
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ConversationMessagingService {
    private readonly logger = new Logger(ConversationMessagingService.name);

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly messageRepository: MessageRepository,
        private readonly userRepository: UserRepository,
        private readonly toolInvocationRepository: ToolInvocationRepository,
        private readonly moduleRef: ModuleRef
    ) {}

    private get platformRegistry(): PlatformAdapterRegistry {
        return this.moduleRef.get(PlatformAdapterRegistry, { strict: false });
    }

    async sendOperatorReply(
        conversationId: string,
        workspaceId: string,
        operatorId: string,
        text: string,
        attachments?: unknown[]
    ): Promise<MessageEntity> {
        const conversation =
            await this.conversationRepository.findOneByIdInWorkspace(
                conversationId,
                workspaceId,
                { populate: ['account'] }
            );

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        const account = conversation.account as AccountEntity;
        const clientNonce = uuidV4();

        const message = await this.messageRepository.insertPendingOutbound(
            conversationId,
            clientNonce,
            {
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                authorId: operatorId,
                text,
                attachments,
                dateSent: new Date(),
            }
        );

        try {
            const adapter = this.platformRegistry.get(account.type);
            const { externalId } = await adapter.sendMessage(
                account,
                conversation.senderId,
                toText(text)
            );
            await this.messageRepository.markOutboundSent(
                clientNonce,
                externalId
            );
            message.status = ENUM_MESSAGE_STATUS.SENT;
            message.externalId = externalId;
        } catch (err) {
            this.logger.error(
                `Platform send failed for conversation ${conversationId}: ${err.message}`
            );
            await this.messageRepository.markOutboundFailed(clientNonce);
            message.status = ENUM_MESSAGE_STATUS.FAILED;
            throw new UnprocessableEntityException({
                message: 'conversation.error.messageSendFailed',
                statusCode: 422,
            });
        }

        return message;
    }

    async reactToMessage(params: {
        conversationId: string;
        workspaceId: string;
        messageId: string;
        emoji: string;
        action: 'react' | 'unreact';
        operatorUserId: string;
    }): Promise<MessageGetResponseDto> {
        const {
            conversationId,
            workspaceId,
            messageId,
            emoji,
            action,
            operatorUserId,
        } = params;

        const conversation =
            await this.conversationRepository.findOneByIdInWorkspace(
                conversationId,
                workspaceId,
                { populate: ['account'] }
            );

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        const message = await this.messageRepository.findOne({
            id: messageId,
            conversation: conversationId,
        } as any);

        if (!message || !message.externalId) {
            throw new NotFoundException({
                message: 'conversation.error.messageNotFound',
                statusCode: 404,
            });
        }

        const account = conversation.account as AccountEntity;
        const adapter = this.platformRegistry.get(account.type);

        if (!adapter.capabilities.reactions.outbound) {
            throw new UnprocessableEntityException({
                message: 'conversation.error.reactionsNotSupported',
                statusCode: 422,
            });
        }

        await adapter.addReaction(
            account,
            conversation.senderId,
            message.externalId,
            emoji,
            action
        );

        const updated =
            (await this.messageRepository.applyReaction(
                conversationId,
                message.externalId,
                {
                    emoji,
                    actorType: 'operator',
                    actorId: operatorUserId,
                    action,
                }
            )) ?? message;

        const userNameMap = await this.buildUserNameMap([updated]);
        return this.mapMessage(updated, conversation, userNameMap);
    }

    async listMessages(
        conversationId: string,
        workspaceId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<{
        messages: MessageEntity[];
        conversation: ConversationEntity;
        total: number;
    }> {
        const conversation =
            await this.conversationRepository.findOneByIdInWorkspace(
                conversationId,
                workspaceId,
                { populate: ['chatbot'] }
            );
        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }
        const [messages, total] = await Promise.all([
            this.messageRepository.findByConversation(conversationId, options),
            this.messageRepository.countByConversation(conversationId),
        ]);
        return { messages, conversation, total };
    }

    /**
     * Load ToolInvocation rows joined to a conversation, optionally bounded by
     * the time range of the messages currently visible (so paginated message
     * pages only fetch invocations that could possibly attach to them).
     */
    async listToolInvocations(
        conversationId: string,
        range?: { from?: Date; to?: Date }
    ): Promise<ToolInvocationEntity[]> {
        const where: Record<string, unknown> = { conversationId };
        if (range?.from || range?.to) {
            const createdAt: Record<string, Date> = {};
            if (range.from) createdAt['$gte'] = range.from;
            if (range.to) createdAt['$lte'] = range.to;
            where.createdAt = createdAt;
        }
        return this.toolInvocationRepository.find(where as any, {
            orderBy: { createdAt: 'ASC' } as any,
            populate: ['tool'],
        });
    }

    mapMessage(
        message: MessageEntity,
        conversation?: ConversationEntity,
        userNameMap?: Map<string, string>
    ): MessageGetResponseDto {
        const dto = plainToInstance(MessageGetResponseDto, message, {
            excludeExtraneousValues: true,
        });
        dto.author = this.resolveAuthor(message, conversation, userNameMap);
        dto.reactions = message.reactions ?? [];
        return dto;
    }

    /**
     * Map messages to DTOs, resolving author names and splicing persisted tool
     * invocations under the nearest-following BOT message.
     */
    mapMessages(
        messages: MessageEntity[],
        conversation?: ConversationEntity,
        userNameMap?: Map<string, string>,
        invocations: ToolInvocationEntity[] = []
    ): MessageGetResponseDto[] {
        const dtos = messages.map(m =>
            this.mapMessage(m, conversation, userNameMap)
        );

        if (!invocations.length) return dtos;

        const botIndices = messages
            .map((m, i) => (m.authorType === ENUM_MESSAGE_AUTHOR.BOT ? i : -1))
            .filter(i => i !== -1);

        if (!botIndices.length) return dtos;

        for (const inv of invocations) {
            // Find the nearest BOT message whose dateSent is >= invocation.createdAt.
            // The bot reply is persisted *after* the tool call completes, so the
            // invocation's createdAt precedes (or equals) the BOT message's dateSent.
            let targetIdx = botIndices.find(
                i => messages[i].dateSent.getTime() >= inv.createdAt.getTime()
            );
            if (targetIdx === undefined) {
                // Invocation is later than every BOT message in this page —
                // attach to the last BOT message so it's still visible.
                targetIdx = botIndices[botIndices.length - 1];
            }
            const dto = dtos[targetIdx];
            if (!dto.toolCalls) dto.toolCalls = [];
            dto.toolCalls.push(this.serializeInvocation(inv));
        }

        return dtos;
    }

    private serializeInvocation(
        inv: ToolInvocationEntity
    ): ToolCallSerialization {
        return {
            invocationId: inv.id,
            toolName: inv.tool?.displayName ?? 'unknown',
            actionName: inv.actionName,
            args: inv.inputArgs,
            status:
                inv.status === ENUM_TOOL_INVOCATION_STATUS.SUCCESS
                    ? 'success'
                    : 'error',
            result: inv.outputResult,
            error: inv.errorMessage,
            durationMs: inv.durationMs,
        };
    }

    private resolveAuthor(
        message: MessageEntity,
        conversation?: ConversationEntity,
        userNameMap?: Map<string, string>
    ): { id: string; name: string } {
        const id = message.authorId;

        if (message.authorType === ENUM_MESSAGE_AUTHOR.OPERATOR) {
            // Imported page messages (adapter.reconcile, message_echoes) are
            // also OPERATOR, but authored outside eccho, so authorId is the
            // platform's page id and no user will ever match. Name them after
            // the account rather than showing a bare numeric id.
            const name =
                userNameMap?.get(id) ?? conversation?.account?.name ?? id;
            return { id, name };
        }

        if (message.authorType === ENUM_MESSAGE_AUTHOR.BOT) {
            // authorId is the chatbot's UUID in most cases; use the loaded chatbot name if available
            const name = conversation?.chatbot?.name ?? id;
            return { id, name };
        }

        // USER message
        const name = conversation?.senderName ?? id;
        return { id, name };
    }

    /**
     * Builds a userId → name map for all OPERATOR messages in the provided list
     * by doing a single batch query against the users table.
     */
    async buildUserNameMap(
        messages: MessageEntity[]
    ): Promise<Map<string, string>> {
        // users.id is a uuid column, so nothing else may reach the query:
        // Postgres rejects the whole statement on the first bad value, which
        // used to fail the entire message list. Imported page messages are
        // OPERATOR carrying a numeric platform id — never an eccho user.
        const operatorIds = [
            ...new Set(
                messages
                    .filter(m => m.authorType === ENUM_MESSAGE_AUTHOR.OPERATOR)
                    .map(m => m.authorId)
                    .filter(id => UUID_PATTERN.test(id ?? ''))
            ),
        ];

        if (operatorIds.length === 0) return new Map();

        const users = await this.userRepository.find({
            id: { $in: operatorIds },
        });

        const map = new Map<string, string>();
        for (const user of users) {
            map.set(user.id, user.name);
        }
        return map;
    }
}
