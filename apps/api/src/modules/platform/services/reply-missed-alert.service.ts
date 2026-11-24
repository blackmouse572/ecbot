import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { RedisConnectionProvider } from '@app/common/redis/redis-connection.provider';
import { IUnansweredInboundRow } from '@app/modules/conversation/interfaces/message.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    REPLY_MISSED_EVENT,
    REPLY_MISSED_KEY_PREFIX,
    REPLY_MISSED_KEY_TTL_SECONDS,
} from '../constants/reply-missed.constant';
import {
    IReplyMissedEvent,
    ReplyMissedSource,
} from '../interfaces/reply-missed.interface';

/**
 * Emits the `reply.missed` structured warn for an inbound customer message
 * the bot left unanswered. One log line per message, claimed in Redis so a
 * turn that already reported the miss is not reported again by the sweep.
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
        private readonly redisAvailable: boolean
    ) {}

    /**
     * A turn ran to completion and the customer got nothing. Claims the
     * burst's message ids so the sweep skips them; logs once for the turn.
     */
    async reportTurnMiss(params: {
        source: Exclude<ReplyMissedSource, 'sweep'>;
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

    /**
     * Log the sweep's candidates, one per message. Returns how many were
     * newly claimed (a message already alerted by its turn's hook is skipped).
     */
    async reportSweepMisses(rows: IUnansweredInboundRow[]): Promise<number> {
        let alerted = 0;

        for (const row of rows) {
            if (!(await this.claim(row.messageId))) continue;
            this.logger.warn(
                {
                    event: REPLY_MISSED_EVENT,
                    source: 'sweep',
                    conversationId: row.conversationId,
                    chatbotId: row.chatbotId,
                    workspaceId: row.workspaceId,
                    platform: row.platform,
                    ageSec: Math.max(
                        0,
                        Math.round(
                            (Date.now() - row.createdAt.getTime()) / 1000
                        )
                    ),
                } satisfies IReplyMissedEvent,
                'inbound message left unanswered by the bot'
            );
            alerted += 1;
        }

        return alerted;
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
