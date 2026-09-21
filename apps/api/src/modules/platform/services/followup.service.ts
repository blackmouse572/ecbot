import { AccountService } from '@app/modules/account/services/account.service';
import {
    AIChatHistoryMessage,
    ChatbotAIService,
} from '@app/modules/chatbot/services/chatbot-ai.service';
import { ENUM_CONVERSATION_STATUS } from '@app/modules/conversation/enums/conversation.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ConversationService } from '@app/modules/conversation/services/conversation.service';
import { ManifestBuilderService } from '@app/modules/tool/services/manifest-builder.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import {
    ENUM_FOLLOWUP_PROCESS,
    ENUM_FOLLOWUP_SKIP_REASON,
    ENUM_FOLLOWUP_STATUS,
    FOLLOWUP_QUEUE,
    FOLLOWUP_TASK_PREFIX,
    OUTCOME_REASON_MAX_LENGTH,
} from '../constants/followup.constant';
import { MESSAGE_HISTORY_WINDOW } from '../constants/message-debounce.constant';
import { FollowupListResponseDto } from '../dtos/response/followup.list.response.dto';
import { FollowupPendingResponseDto } from '../dtos/response/followup.pending.response.dto';
import {
    IFollowupJob,
    IFollowupOutcome,
    IFollowupWorkspaceFilter,
} from '../interfaces/followup.interface';
import { FollowupEntity } from '../repository/entities/followup.entity';
import { FollowupRepository } from '../repository/repositories/followup.repository';
import { PlatformAdapterRegistry } from './platform-adapter.registry';
import { StreamingDelivery } from './streaming-delivery.service';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from '@app/app/ai-usage-meter.interface';

@Injectable()
export class FollowupService {
    private readonly logger = new Logger(FollowupService.name);

    constructor(
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly followupRepository: FollowupRepository,
        private readonly accountService: AccountService,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly messageRepository: MessageRepository,
        private readonly registry: PlatformAdapterRegistry,
        private readonly manifestBuilder: ManifestBuilderService,
        private readonly streaming: StreamingDelivery,
        private readonly moduleRef: ModuleRef,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    async schedule(data: IFollowupJob, delayMinutes: number): Promise<string> {
        const scheduledAt = new Date(
            Date.now() + Math.max(0, delayMinutes) * 60_000
        );
        const followup = await this.followupRepository.createScheduled({
            chatbotId: data.chatbotId,
            conversationId: data.conversationId,
            prompt: data.prompt,
            reason: data.reason,
            triggerMessageId: data.triggerMessageId,
            scheduledAt,
        });

        try {
            await this.cloudTasksClient.enqueue(
                FOLLOWUP_QUEUE,
                ENUM_FOLLOWUP_PROCESS.FIRE,
                { ...data, followupId: followup.id },
                {
                    taskName: `${FOLLOWUP_TASK_PREFIX}${followup.id}`,
                    scheduleTime: scheduledAt,
                }
            );
        } catch (error: unknown) {
            // No timer exists, so the row would sit as SCHEDULED forever.
            await this.followupRepository.deleteById(followup.id);
            throw error;
        }

        return followup.id;
    }

    async cancel(followupId: string): Promise<boolean> {
        const followup =
            await this.followupRepository.findPendingById(followupId);
        if (!followup) return false;

        await this.applyCancellation(followup);
        return true;
    }

    async cancelForWorkspace(
        workspaceId: string,
        followupId: string
    ): Promise<{ cancelled: boolean }> {
        const followup = await this.followupRepository.findPendingById(
            followupId,
            workspaceId
        );
        if (!followup) return { cancelled: false };

        await this.applyCancellation(followup);
        return { cancelled: true };
    }

    async findScheduledByConversation(
        conversationId: string
    ): Promise<FollowupEntity[]> {
        return this.followupRepository.findScheduledByConversation(
            conversationId
        );
    }

    async findAllByWorkspace(
        workspaceId: string,
        filter: IFollowupWorkspaceFilter
    ): Promise<[FollowupEntity[], number]> {
        return this.followupRepository.findAllByWorkspace(workspaceId, filter);
    }

    mapList(followups: FollowupEntity[]): FollowupListResponseDto[] {
        return plainToInstance(FollowupListResponseDto, followups, {
            excludeExtraneousValues: true,
        });
    }

    mapPending(followups: FollowupEntity[]): FollowupPendingResponseDto[] {
        return plainToInstance(FollowupPendingResponseDto, followups, {
            excludeExtraneousValues: true,
        });
    }

    async fire(data: IFollowupJob & { followupId?: string }): Promise<void> {
        const followup = await this.loadFiringRow(data.followupId);
        // `undefined` row + a followupId means the guard already rejected it.
        if (followup === undefined) return;

        if (followup) {
            await this.followupRepository.incrementAttempts(
                followup.id,
                followup.attempts
            );
        }

        const skipReason = await this.resolveSkipReason(data);
        if (skipReason) {
            return this.recordOutcome(followup, data.conversationId, {
                status: ENUM_FOLLOWUP_STATUS.SKIPPED,
                outcomeReason: skipReason,
            });
        }

        await this.generateAndDeliver(followup, data);
    }

    private get conversationService(): ConversationService {
        return this.moduleRef.get(ConversationService, { strict: false });
    }

    /**
     * Returns the row to log against, `null` when there is none to log against,
     * or `undefined` when this delivery must not run at all.
     */
    private async loadFiringRow(
        followupId?: string
    ): Promise<FollowupEntity | null | undefined> {
        if (!followupId) return null;

        const followup = await this.followupRepository.findById(followupId);
        if (!followup) {
            // Task enqueued before this deploy, or the row was pruned.
            this.logger.warn(
                `Followup ${followupId} has no log row; firing without one`
            );
            return null;
        }

        if (!this.isPending(followup)) {
            // A lost response after a successful delivery would otherwise make
            // the Cloud Tasks retry send the message twice.
            this.logger.log(
                `followup=${followup.id} status=${followup.status} skipped duplicate delivery`
            );
            return undefined;
        }

        return followup;
    }

    private isPending(followup: FollowupEntity): boolean {
        return (
            followup.status === ENUM_FOLLOWUP_STATUS.SCHEDULED ||
            followup.status === ENUM_FOLLOWUP_STATUS.FAILED
        );
    }

    /** `null` when the followup should actually be delivered. */
    private async resolveSkipReason(
        data: IFollowupJob
    ): Promise<ENUM_FOLLOWUP_SKIP_REASON | null> {
        const conversation = await this.conversationService.findOneById(
            data.conversationId
        );
        if (!conversation) {
            return ENUM_FOLLOWUP_SKIP_REASON.CONVERSATION_MISSING;
        }
        if (!conversation.botEnabled) {
            return ENUM_FOLLOWUP_SKIP_REASON.BOT_DISABLED;
        }
        if (conversation.status === ENUM_CONVERSATION_STATUS.RESOLVED) {
            return ENUM_FOLLOWUP_SKIP_REASON.CONVERSATION_RESOLVED;
        }

        return null;
    }

    private async generateAndDeliver(
        followup: FollowupEntity | null,
        data: IFollowupJob
    ): Promise<void> {
        const {
            conversationId,
            chatbotId,
            userId,
            providerId,
            customerId,
            contactPointId,
            prompt,
        } = data;

        const account = await this.accountService.findOne(
            { id: providerId },
            { populate: ['chatbot', 'chatbot.workspace'] }
        );
        if (!account?.chatbot) {
            return this.recordOutcome(followup, conversationId, {
                status: ENUM_FOLLOWUP_STATUS.SKIPPED,
                outcomeReason: ENUM_FOLLOWUP_SKIP_REASON.CHATBOT_MISSING,
            });
        }

        const chatbot = account.chatbot;
        const adapter = this.registry.get(account.type);
        const tools = await this.manifestBuilder.build(
            chatbot.id,
            chatbot.workspace.id
        );
        const history = await this.buildHistory(conversationId);

        // A follow-up is our idea, not the customer's — it is the first thing
        // that should stop when the workspace runs out of tokens.
        // No meter is the public build: allowed, and nothing recorded below.
        const budget = (await this.meter?.check(
            chatbot.workspace.id,
            chatbot
        )) ?? { allowed: true };
        if (!budget.allowed) {
            return this.recordOutcome(followup, conversationId, {
                status: ENUM_FOLLOWUP_STATUS.SKIPPED,
                outcomeReason: ENUM_FOLLOWUP_SKIP_REASON.TOKEN_QUOTA_EXHAUSTED,
            });
        }

        const ac = new AbortController();
        let anyPersisted = false;
        try {
            const stream = await this.chatbotAIService.streamChat(
                {
                    chatbot_id: chatbotId,
                    user_id: userId,
                    provider_id: providerId,
                    message: prompt,
                    chat_session_id: conversationId,
                    conversation_id: conversationId,
                    customer_id: customerId,
                    contact_point_id: contactPointId,
                    tools,
                    max_tool_iterations: 5,
                    history,
                },
                ac.signal
            );

            const deliveryResult = await this.streaming.deliver({
                adapter,
                account,
                senderId: userId,
                conversationId,
                chatbot, // selects incremental vs buffered by guardrail config
                stream,
                abort: ac,
                isCurrent: async () => true,
                onSegmentPersist: async (segmentText: string) => {
                    const nonce = randomUUID();
                    await this.messageRepository.insertPendingOutbound(
                        conversationId,
                        nonce,
                        {
                            authorType: ENUM_MESSAGE_AUTHOR.BOT,
                            authorId: chatbot.id,
                            text: segmentText,
                            dateSent: new Date(),
                        }
                    );
                    anyPersisted = true;
                    return nonce;
                },
                onSent: async (nonce: string, externalId: string) => {
                    await this.messageRepository.markOutboundSent(
                        nonce,
                        externalId
                    );
                },
                onFailed: async (nonce: string) => {
                    await this.messageRepository.markOutboundFailed(nonce);
                },
            });
            if (deliveryResult.usage) {
                await this.meter?.record({
                    workspaceId: chatbot.workspace.id,
                    usage: deliveryResult.usage,
                    source: ENUM_AI_USAGE_SOURCE.FOLLOWUP,
                    chatbotId: chatbot.id,
                    accountId: account.id,
                    platform: account.type,
                    model: chatbot.modelTextName,
                    conversationId,
                });
            }

            if (deliveryResult.generationFailed) {
                throw new Error('Followup AI generation failed');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `Followup generation failed for conversation ${conversationId}: ${message}`
            );
            await this.recordOutcome(followup, conversationId, {
                status: ENUM_FOLLOWUP_STATUS.FAILED,
                outcomeReason: message,
            });
            if (!anyPersisted) throw err;
            return;
        }

        await this.recordOutcome(followup, conversationId, {
            status: ENUM_FOLLOWUP_STATUS.COMPLETED,
        });
    }

    /** Safety net for an empty agent thread — replay recent turns from the DB. */
    private async buildHistory(
        conversationId: string
    ): Promise<AIChatHistoryMessage[]> {
        const recent = await this.messageRepository.findRecentByConversation(
            conversationId,
            MESSAGE_HISTORY_WINDOW
        );

        return recent
            .filter(message => message.text)
            .map(message => ({
                role:
                    message.direction === ENUM_MESSAGE_DIRECTION.INBOUND
                        ? 'user'
                        : 'assistant',
                content: message.text as string,
            }));
    }

    private async applyCancellation(followup: FollowupEntity): Promise<void> {
        await this.deleteTask(`${FOLLOWUP_TASK_PREFIX}${followup.id}`);
        await this.followupRepository.markCancelled(followup.id);
        this.logger.log(
            `followup=${followup.id} status=${ENUM_FOLLOWUP_STATUS.CANCELLED}`
        );
    }

    /** Records the terminal state of a fired followup and logs one line for it. */
    private async recordOutcome(
        followup: FollowupEntity | null,
        conversationId: string,
        outcome: IFollowupOutcome
    ): Promise<void> {
        const outcomeReason = outcome.outcomeReason?.slice(
            0,
            OUTCOME_REASON_MAX_LENGTH
        );

        if (followup) {
            await this.followupRepository.applyOutcome(followup.id, {
                status: outcome.status,
                outcomeReason,
            });
        }

        this.logger.log(
            `followup=${followup?.id ?? 'unknown'} status=${outcome.status} conversation=${conversationId} reason=${outcomeReason ?? '-'}`
        );
    }

    private async deleteTask(taskName: string): Promise<void> {
        try {
            await this.cloudTasksClient.deleteTask(FOLLOWUP_QUEUE, taskName);
        } catch (error: unknown) {
            if ((error as { code?: number })?.code !== 5) throw error;
        }
    }
}
