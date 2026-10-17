import { HandoffEmailService } from './handoff-email.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { ChatbotAIService } from '@app/modules/chatbot/services/chatbot-ai.service';
import { CustomerTagClassifierService } from '@app/modules/customer/services/customer-tag-classifier.service';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { WorkspaceMemberEntity } from '@app/modules/workspace/repository/entities/workspace-member.entity';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { wrap } from '@mikro-orm/core';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';
import {
    IConversationFindOrCreate,
    IConversationService,
    IHandoffKeywordMatch,
} from '../interfaces/conversation.service.interface';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { ConversationEntity } from '../repository/entities/conversation.entity';
import { ConversationRepository } from '../repository/repositories/conversation.repository';
import { ConversationReadRepository } from '../repository/repositories/conversation-read.repository';
import { MessageRepository } from '../repository/repositories/message.repository';
import { STAFF_HANDLED_NOTE } from '../constants/message.constant';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
    ENUM_MESSAGE_STATUS,
} from '../enums/message.enum';

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
        private readonly moduleRef: ModuleRef,
        private readonly messageRepository: MessageRepository,
        private readonly activityService: ActivityService
    ) {}

    private get handoffEmail(): HandoffEmailService | undefined {
        return this.moduleRef.get(HandoffEmailService, { strict: false });
    }

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
            await this.leaveStaffHandledNote(conversationId);
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

        // Read before the update: the ORM changes the loaded entity in place.
        const handsBack = botEnabled && !conversation.botEnabled;
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

        if (handsBack) {
            await this.leaveStaffHandledNote(conversationId);
        }

        return updated;
    }

    /** Staff hand the conversation back to the bot (resolve, or switch the
     *  bot on): mark the point in its history so it does not hand over again
     *  what staff already took care of. */
    private async leaveStaffHandledNote(conversationId: string): Promise<void> {
        // Switching the bot on and then resolving is one hand-back: one note.
        const [newest] = await this.messageRepository.findNewest(
            { conversation: conversationId, deletedAt: null } as any,
            1
        );
        if (newest?.authorType === ENUM_MESSAGE_AUTHOR.SYSTEM) return;

        await this.messageRepository.create({
            conversation: { id: conversationId },
            direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
            authorType: ENUM_MESSAGE_AUTHOR.SYSTEM,
            authorId: ENUM_MESSAGE_AUTHOR.SYSTEM,
            text: STAFF_HANDLED_NOTE,
            dateSent: new Date(),
            status: ENUM_MESSAGE_STATUS.SENT,
        } as any);
    }

    async setTimezone(
        conversationId: string,
        timezone: string | null
    ): Promise<ConversationEntity> {
        const updated = await this.conversationRepository.updateEntity(
            { id: conversationId },
            { timezone }
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

    /**
     * The handoff keyword the message contains, and whether it is the owner's
     * own (checked first, it wins) or from the default list. Null if none.
     */
    detectHandoffKeywords(
        message: string,
        keywords: string[]
    ): IHandoffKeywordMatch | null {
        if (!message) return null;

        const lowerMessage = message.toLowerCase();
        const find = (list: string[]) =>
            list.find(keyword => lowerMessage.includes(keyword.toLowerCase()));

        const custom = find(keywords);
        if (custom) return { keyword: custom, source: 'custom' };
        const fallback = find(DEFAULT_HANDOFF_KEYWORDS);
        return fallback ? { keyword: fallback, source: 'default' } : null;
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
        language?: string,
        tagId?: string
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

        // The dashboard's handoff rate counts these rows, one per episode: a
        // tag rule or guardrail can trigger again while `handoffAt` is still
        // set (staff clear it on resolve). Never fatal.
        if (!conversation.handoffAt)
            await this.activityService
                .createByBotWithWorkspace(workspaceId, {
                    action: ENUM_ACTIVITY_ACTION.CONVERSATION_HANDOFF,
                    subject: ENUM_POLICY_SUBJECT.CONVERSATION,
                    metadata: {
                        id: conversation.id,
                        name: conversation.senderName,
                        reason,
                        ...(tagId ? { tagId } : {}),
                    },
                })
                .catch((err: unknown) =>
                    this.logger.warn(
                        `Handoff activity for ${conversation.id} not logged: ${(err as Error).message}`
                    )
                );

        // Notify operators (all active workspace members)
        await this.notifyOperators(
            conversation.id,
            workspaceId,
            reason,
            language
        );
        // And email the owner and whoever can see conversations. Not awaited:
        // the customer's handoff reply must not wait on email lookups (send
        // never rejects).
        void this.handoffEmail?.send(
            conversation.id,
            workspaceId,
            reason,
            language
        );

        return updated;
    }

    /**
     * Tells the team a customer was tagged, without a handoff: the bot keeps
     * replying (#288). Same recipients as a handoff, in-app and by email.
     */
    async notifyTeam(
        conversation: ConversationEntity,
        workspaceId: string,
        tagName: string,
        language?: string
    ): Promise<void> {
        await this.notifyMembers(workspaceId, conversation.id, member =>
            this.notificationService.createTagNotice(member.user.id, {
                conversationId: conversation.id,
                workspaceId,
                workspaceSlug: member.workspace.slug,
                tagName,
                language,
            })
        );
        // Not awaited, like the handoff email (send never rejects).
        void this.handoffEmail?.send(
            conversation.id,
            workspaceId,
            'tag_notice',
            language,
            tagName
        );
    }

    async notifyOperators(
        conversationId: string,
        workspaceId: string,
        reason: string,
        language?: string
    ): Promise<void> {
        await this.notifyMembers(workspaceId, conversationId, member =>
            this.notificationService.createHandoff(member.user.id, {
                conversationId,
                workspaceId,
                workspaceSlug: member.workspace.slug,
                reason,
                language,
            })
        );
    }

    /** Sends one notification to every active member; never throws. */
    private async notifyMembers(
        workspaceId: string,
        conversationId: string,
        notify: (member: WorkspaceMemberEntity) => Promise<unknown>
    ): Promise<void> {
        try {
            const members =
                await this.workspaceMemberRepository.findActiveByWorkspace(
                    workspaceId
                );

            if (!members || members.length === 0) {
                this.logger.warn(
                    `No active members in workspace ${workspaceId} to notify about conversation ${conversationId}`
                );
                return;
            }

            await Promise.all(
                members.map(member =>
                    notify(member).catch(err => {
                        this.logger.error(
                            `Failed to notify member ${member.user.id}: ${err.message}`
                        );
                    })
                )
            );

            this.logger.log(
                `Notified ${members.length} members about conversation ${conversationId}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to notify members for conversation ${conversationId}: ${error.message}`
            );
        }
    }
}
