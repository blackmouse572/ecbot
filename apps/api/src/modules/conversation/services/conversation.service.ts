import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { ChatbotAIService } from '@app/modules/chatbot/services/chatbot-ai.service';
import { CustomerTagClassifierService } from '@app/modules/customer/services/customer-tag-classifier.service';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { wrap } from '@mikro-orm/core';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import {
    NotificationPriority,
    NotificationType,
} from '../../notification/enums/notification.enum';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';
import {
    IConversationFindOrCreate,
    IConversationService,
} from '../interfaces/conversation.service.interface';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { ConversationEntity } from '../repository/entities/conversation.entity';
import { ConversationRepository } from '../repository/repositories/conversation.repository';
import { ConversationReadRepository } from '../repository/repositories/conversation-read.repository';

const DEFAULT_HANDOFF_KEYWORDS = [
    'human',
    'agent',
    'operator',
    'person',
    'support',
    'speak to',
    'talk to',
    'connect me',
    'real person',
    'customer service',
    'help me',
    'escalate',
    // Vietnamese equivalents
    'người thật',
    'nhân viên',
    'tư vấn viên',
    'hỗ trợ',
    'chuyển',
];

@Injectable()
export class ConversationService implements IConversationService {
    private readonly logger = new Logger(ConversationService.name);

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly notificationService: NotificationService,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly conversationReadRepository: ConversationReadRepository,
        private readonly customerTagClassifierService: CustomerTagClassifierService,
        private readonly moduleRef: ModuleRef
    ) {}

    private get platformRegistry(): PlatformAdapterRegistry {
        return this.moduleRef.get(PlatformAdapterRegistry, { strict: false });
    }

    /**
     * Whether the account's platform adapter supports sending reactions.
     * Defaults to false when the account relation isn't populated or the
     * platform can't be resolved (e.g. unsupported/unregistered adapter).
     */
    private resolveCanReact(conversation: ConversationEntity): boolean {
        const account = conversation.account as AccountEntity | undefined;
        if (!account || !wrap(account).isInitialized()) return false;

        try {
            const adapter = this.platformRegistry.get(account.type);
            return !!adapter.capabilities.reactions.outbound;
        } catch {
            return false;
        }
    }

    async findOrCreate(
        params: IConversationFindOrCreate
    ): Promise<ConversationEntity> {
        const { chatbotId, accountId, senderId, contactPointId } = params;

        let conversation =
            await this.conversationRepository.findByChatbotAccountSender(
                chatbotId,
                accountId,
                senderId
            );

        if (!conversation) {
            conversation = await this.conversationRepository.create({
                chatbot: { id: chatbotId } as any,
                account: { id: accountId } as any,
                senderId,
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: true,
                fallbackCount: 0,
                lastMessageAt: new Date(),
                ...(contactPointId
                    ? { contactPoint: { id: contactPointId } as any }
                    : {}),
            });
            this.logger.debug(
                `Created new conversation for sender ${senderId} on account ${accountId}`
            );
        } else if (contactPointId && !conversation.contactPoint) {
            // Existing conversation without contactPoint — attach it now.
            await this.conversationRepository.updateEntity(
                { id: conversation.id },
                { contactPoint: { id: contactPointId } as any } as any
            );
            conversation.contactPoint = { id: contactPointId } as any;
        }

        return conversation;
    }

    async findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ConversationEntity | null> {
        return this.conversationRepository.findOneById(id, options);
    }

    async findOneByIdInWorkspace(
        id: string,
        workspaceId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ConversationEntity | null> {
        return this.conversationRepository.findOneByIdInWorkspace(
            id,
            workspaceId,
            options
        );
    }

    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ConversationEntity[]> {
        return this.conversationRepository.findByWorkspace(
            workspaceId,
            find,
            options
        );
    }

    async countByWorkspace(
        workspaceId: string,
        find?: Record<string, any>
    ): Promise<number> {
        return this.conversationRepository.countByWorkspace(workspaceId, find);
    }

    async updateStatus(
        conversationId: string,
        status: ENUM_CONVERSATION_STATUS,
        reason?: string
    ): Promise<ConversationEntity> {
        const conversation =
            await this.conversationRepository.findOneById(conversationId);

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        // Lifecycle transitions. Both resolve and reopen reset to a clean slate:
        // the bot is turned back on and any handoff state is cleared.
        const updateData: Partial<ConversationEntity> = {
            status,
            botEnabled: true,
            handoffAt: null,
            handoffReason: null,
            fallbackCount: 0,
        };

        if (status === ENUM_CONVERSATION_STATUS.RESOLVED) {
            updateData.resolvedAt = new Date();
        } else if (status === ENUM_CONVERSATION_STATUS.OPEN) {
            updateData.resolvedAt = null;
        }

        // Wipe the LangGraph thread so the next episode starts without prior context bleeding in
        this.chatbotAIService
            .deleteSession(conversationId)
            .catch(err =>
                this.logger.error(
                    `Failed to delete AI session for conversation ${conversationId}: ${err.message}`
                )
            );

        const updated = await this.conversationRepository.updateEntity(
            { id: conversationId },
            updateData
        );

        if (!updated) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        // End-of-conversation analytical tag + summary refresh (#170). Fire
        // immediately on resolve so operators see updated tags right away.
        if (status === ENUM_CONVERSATION_STATUS.RESOLVED) {
            this.customerTagClassifierService
                .scheduleOnResolved(conversationId)
                .catch(err =>
                    this.logger.warn(
                        `scheduleOnResolved failed for ${conversationId}: ${err.message}`
                    )
                );
        }

        return updated;
    }

    async setBotEnabled(
        conversationId: string,
        botEnabled: boolean,
        reason?: string
    ): Promise<ConversationEntity> {
        const conversation =
            await this.conversationRepository.findOneById(conversationId);

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        const updateData: Partial<ConversationEntity> = { botEnabled };

        if (botEnabled) {
            // Re-enabling the bot — clear handoff state, resume with existing context
            updateData.handoffAt = null;
            updateData.handoffReason = null;
            updateData.fallbackCount = 0;

            // Reseed-on-resume (#140): an operator manually returning a
            // handed-off conversation to the bot is a handoff->bot resume
            // point. Wipe the LangGraph thread so the next episode rebuilds
            // full history from the DB — including any OPERATOR messages
            // sent during handoff, which never entered the agent's memory.
            //
            // Only on a genuine false->true transition: a redundant
            // {botEnabled:true} on an already-enabled conversation must NOT
            // wipe the bot's active session mid-conversation.
            if (!conversation.botEnabled) {
                this.chatbotAIService
                    .deleteSession(conversationId)
                    .catch(err =>
                        this.logger.error(
                            `Failed to delete AI session for conversation ${conversationId}: ${err.message}`
                        )
                    );
            }
        } else if (reason) {
            // Manual takeover — store the reason for context, but no alarm/handoffAt
            updateData.handoffReason = reason;
        }

        const updated = await this.conversationRepository.updateEntity(
            { id: conversationId },
            updateData
        );

        if (!updated) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        return updated;
    }

    async recordFallback(
        chatbotId: string,
        accountId: string,
        senderId: string,
        fallbackThreshold: number
    ): Promise<{ triggered: boolean; conversation: ConversationEntity }> {
        const conversation = await this.findOrCreate({
            chatbotId,
            accountId,
            senderId,
        });

        const newCount = (conversation.fallbackCount ?? 0) + 1;

        const updated = await this.conversationRepository.updateEntity(
            { id: conversation.id },
            { fallbackCount: newCount }
        );

        if (!updated) {
            return { triggered: false, conversation };
        }

        const triggered = newCount >= fallbackThreshold;
        return { triggered, conversation: updated };
    }

    detectHandoffKeywords(message: string, keywords: string[]): boolean {
        if (!message) return false;

        const lowerMessage = message.toLowerCase();
        const allKeywords = [...DEFAULT_HANDOFF_KEYWORDS, ...keywords];

        return allKeywords.some(keyword =>
            lowerMessage.includes(keyword.toLowerCase())
        );
    }

    async touchLastMessage(
        chatbotId: string,
        accountId: string,
        senderId: string
    ): Promise<void> {
        const conversation =
            await this.conversationRepository.findByChatbotAccountSender(
                chatbotId,
                accountId,
                senderId
            );

        if (conversation) {
            await this.conversationRepository.updateEntity(
                { id: conversation.id },
                { lastMessageAt: new Date() }
            );
        }
    }

    async updateSenderProfile(
        id: string,
        patch: {
            senderName?: string;
            senderAvatar?: string | null;
            senderProfileFetchedAt: Date;
        }
    ): Promise<void> {
        await this.conversationRepository.updateEntity({ id }, patch as any);
    }

    async resetFallbackCount(conversationId: string): Promise<void> {
        await this.conversationRepository.updateEntity(
            { id: conversationId },
            { fallbackCount: 0 }
        );
    }

    mapGet(conversation: ConversationEntity): ConversationGetResponseDto {
        const dto = plainToInstance(ConversationGetResponseDto, conversation, {
            excludeExtraneousValues: true,
        });
        // Surface customerId via the contactPoint relation. We only read
        // properties when the reference is initialised — touching `customer`
        // on an uninitialised proxy throws `ReferenceNotInitializedError`
        // (e.g. list endpoints that don't populate contactPoint).
        // The detail endpoint populates `contactPoint.customer`, so the
        // detail response surfaces it; list responses leave it undefined.
        const cp = conversation.contactPoint as any;
        if (cp && wrap(cp).isInitialized()) {
            const customer = cp.customer;
            if (customer) {
                dto.customerId = wrap(customer).isInitialized()
                    ? customer.id
                    : customer.id; // FK proxies still expose `id` safely
            }
        }
        dto.canReact = this.resolveCanReact(conversation);
        return dto;
    }

    mapList(
        conversations: ConversationEntity[],
        unreadCounts?: Map<string, number>
    ): ConversationGetResponseDto[] {
        return conversations.map(c => {
            const dto = plainToInstance(ConversationGetResponseDto, c, {
                excludeExtraneousValues: true,
            });
            dto.unreadCount = unreadCounts?.get(c.id) ?? 0;
            return dto;
        });
    }

    async markConversationRead(
        operatorId: string,
        conversationId: string
    ): Promise<void> {
        await this.conversationReadRepository.upsertRead(
            operatorId,
            conversationId
        );
    }

    async getUnreadCounts(
        operatorId: string,
        conversationIds: string[],
        workspaceId: string
    ): Promise<Map<string, number>> {
        return this.conversationReadRepository.getUnreadCounts(
            operatorId,
            conversationIds,
            workspaceId
        );
    }

    async triggerHandoff(
        conversation: ConversationEntity,
        workspaceId: string,
        reason: string,
        handoffMessage?: string
    ): Promise<ConversationEntity> {
        // Auto-escalation: turn the bot off and raise the alarm (handoffAt + notification).
        // This is what distinguishes an escalation from a quiet manual takeover.
        const updated = await this.conversationRepository.updateEntity(
            { id: conversation.id },
            {
                botEnabled: false,
                handoffAt: new Date(),
                handoffReason: reason,
            }
        );

        if (!updated) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        // Notify operators (all active workspace members)
        await this.notifyOperators(
            conversation.id,
            workspaceId,
            reason,
            handoffMessage
        );

        return updated;
    }

    async notifyOperators(
        conversationId: string,
        workspaceId: string,
        reason: string,
        handoffMessage?: string
    ): Promise<void> {
        try {
            const members =
                await this.workspaceMemberRepository.findActiveByWorkspace(
                    workspaceId
                );

            if (!members || members.length === 0) {
                this.logger.warn(
                    `No active members in workspace ${workspaceId} to notify of handoff`
                );
                return;
            }

            const notificationPromises = members.map(member =>
                this.notificationService
                    .create({
                        title: 'Conversation Handoff Required',
                        message: handoffMessage
                            ? `${handoffMessage} (Reason: ${reason})`
                            : `A customer conversation requires human attention. Reason: ${reason}`,
                        type: NotificationType.WARNING,
                        priority: NotificationPriority.HIGH,
                        recipient: member.user.id,
                        metadata: {
                            actionUrl: `/conversations/${conversationId}`,
                            actionText: 'View Conversation',
                            data: { conversationId, workspaceId, reason },
                        },
                    })
                    .catch(err => {
                        this.logger.error(
                            `Failed to notify member ${member.user.id}: ${err.message}`
                        );
                    })
            );

            await Promise.all(notificationPromises);

            this.logger.log(
                `Notified ${members.length} operators about handoff for conversation ${conversationId}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to notify operators for conversation ${conversationId}: ${error.message}`
            );
        }
    }
}
