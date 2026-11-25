import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { RedisConnectionProvider } from '@app/common/redis/redis-connection.provider';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    ENUM_REPLY_MISSED_PROCESS,
    REPLY_MISSED_DELAY_SECONDS,
    REPLY_MISSED_EVENT,
    REPLY_MISSED_KEY_PREFIX,
    REPLY_MISSED_KEY_TTL_SECONDS,
    REPLY_MISSED_QUEUE,
    REPLY_MISSED_TASK_PREFIX,
} from '../constants/reply-missed.constant';
import {
    IReplyMissedEvent,
    ReplyMissedSource,
} from '../interfaces/reply-missed.interface';

/**
 * Emits the `reply.missed` structured warn for an inbound customer message
 * the bot left unanswered. One log line per message, claimed in Redis so a
 * turn that already reported the miss is not reported again by its delayed
 * check.
 *
 * The check is a Cloud Task scheduled per inbound message, not an in-process
 * cron: production Postgres (Neon Free) suspends after five idle minutes, and
 * a minute cron would keep it awake (`test/common/database/cron-cadence.spec.ts`).
 *
 * Platform team only: this is an operations signal, not a workspace bell —
 * the owner cannot act on most causes (apps/ai down, a channel send failure).
 */
@Injectable()
export class ReplyMissedAlertService {
    private readonly logger = new Logger(ReplyMissedAlertService.name);

    constructor(
        private readonly redis: RedisConnectionProvider,
        @Inject(REDIS_AVAILABLE)
        private readonly redisAvailable: boolean,
        private readonly messageRepository: MessageRepository,
        private readonly cloudTasks: CloudTasksQueueClient
    ) {}

    /**
     * Ask for a check of this inbound message five minutes from now. Enqueued
     * right after the row is saved, so it also covers a Turn that never ran.
     */
    async scheduleCheck(messageId: string): Promise<void> {
        await this.cloudTasks.enqueue(
            REPLY_MISSED_QUEUE,
            ENUM_REPLY_MISSED_PROCESS.CHECK,
            { messageId },
            {
                taskName: `${REPLY_MISSED_TASK_PREFIX}${messageId}`,
                scheduleTime: new Date(
                    Date.now() + REPLY_MISSED_DELAY_SECONDS * 1000
                ),
            }
        );
    }

    /**
     * The delayed check: log the miss unless the message was answered, the
     * conversation became a deliberate silence, or another run already
     * claimed it.
     */
    async check(messageId: string): Promise<void> {
        const row =
            await this.messageRepository.findUnansweredInboundById(messageId);
        if (!row) return;
        if (!(await this.claim(messageId))) return;

        this.logger.warn(
            {
                event: REPLY_MISSED_EVENT,
                source: 'check',
                conversationId: row.conversationId,
                chatbotId: row.chatbotId,
                workspaceId: row.workspaceId,
                platform: row.platform,
                ageSec: Math.max(
                    0,
                    Math.round((Date.now() - row.createdAt.getTime()) / 1000)
                ),
            } satisfies IReplyMissedEvent,
            'inbound message left unanswered by the bot'
        );
    }

    /**
     * A turn ran to completion and the customer got nothing. Claims the
     * burst's message ids so the delayed checks skip them; logs once for the
     * turn.
     */
    async reportTurnMiss(params: {
        source: Exclude<ReplyMissedSource, 'check'>;
        conversationId: string;
        reason: string;
        messageIds?: string[];
    }): Promise<void> {
        const ids = params.messageIds ?? [];
        if (ids.length > 0 && !(await this.claimAny(ids))) return;

        this.logger.warn(
            {
                event: REPLY_MISSED_EVENT,
                source: params.source,
                conversationId: params.conversationId,
                reason: params.reason,
            } satisfies IReplyMissedEvent,
            'inbound message left unanswered by the bot'
        );
    }

    /** True when at least one id was newly claimed. */
    private async claimAny(messageIds: string[]): Promise<boolean> {
        let claimed = false;
        for (const messageId of messageIds) {
            if (await this.claim(messageId)) claimed = true;
        }
        return claimed;
    }

    private async claim(messageId: string): Promise<boolean> {
        // A Redis outage costs duplicate alerts, which the acceptance
        // criteria allow; dropping the alert would defeat the purpose.
        if (!this.redisAvailable) return true;

        try {
            const result = await this.redis.client.set(
                `${REPLY_MISSED_KEY_PREFIX}:${messageId}`,
                '1',
                'EX',
                REPLY_MISSED_KEY_TTL_SECONDS,
                'NX'
            );
            return result === 'OK';
        } catch {
            return true;
        }
    }
}
