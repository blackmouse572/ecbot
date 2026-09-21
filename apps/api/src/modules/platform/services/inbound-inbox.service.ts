import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_DEDUP_AGE_SECONDS,
    INBOUND_EVENT_MAX_ATTEMPTS,
    INBOUND_EVENT_QUEUE,
} from '../constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../interfaces/platform-adapter.interface';
import { MessageProcessorService } from './message-processor.service';

/**
 * Inbound Inbox (ADR-0007). The intake seam of the webhook → reply flow:
 * `accept` makes a received platform message durable by enqueueing it BEFORE
 * the webhook ACK, then a worker drains it through the Turn pipeline
 * (MessageProcessorService.process). The BullMQ job is the durable record.
 *
 * Falls back to firing the Turn pipeline directly (no queue to be durable
 * through) when Redis was unreachable at boot — same fire-and-forget shape
 * as the queue path's fast ACK, so a Redis outage doesn't also turn every
 * webhook into a slow request that risks the platform's timeout. This loses
 * receipt-before-ACK crash-safety and at-least-once retry; the inbound
 * dedupe claim inside `process()` still protects against a platform
 * redelivery causing duplicate side effects, but a crash mid-Turn now drops
 * the message instead of being retried — acceptable only because Redis was
 * already unavailable.
 */
@Injectable()
export class InboundInboxService {
    private readonly logger = new Logger(InboundInboxService.name);

    constructor(
        @InjectQueue(INBOUND_EVENT_QUEUE)
        private readonly queue: Queue<PlatformWebhookEvent>,
        @Inject(REDIS_AVAILABLE)
        private readonly redisAvailable: boolean,
        private readonly messageProcessor: MessageProcessorService
    ) {}

    private jobId(
        platform: ENUM_ACCOUNT_TYPE,
        externalMessageId: string
    ): string {
        // No ':' — BullMQ forbids it in custom ids.
        return `${platform}-${externalMessageId}`;
    }

    private jobOptions(jobId: string): JobsOptions {
        return {
            jobId,
            attempts: INBOUND_EVENT_MAX_ATTEMPTS,
            backoff: { type: 'exponential', delay: 2000 },
            // Retention keeps the jobId alive past completion so redeliveries
            // within the platform retry window are deduped no-ops.
            removeOnComplete: { age: INBOUND_EVENT_DEDUP_AGE_SECONDS },
            removeOnFail: { age: 24 * 60 * 60 },
        };
    }

    /**
     * Durably enqueue one inbound event. Returns 'ignored' for events with no
     * externalMessageId (read receipts, delivery, typing) — they carry no dedup
     * key and the Turn pipeline ignores them anyway.
     *
     * Throws if the enqueue fails so the controller can return 5xx and let the
     * platform retry (receipt-before-ACK).
     */
    async accept(
        platform: ENUM_ACCOUNT_TYPE,
        event: PlatformWebhookEvent
    ): Promise<'accepted' | 'ignored'> {
        if (!event.externalMessageId) return 'ignored';

        if (!this.redisAvailable) {
            this.messageProcessor.process(event).catch(err =>
                this.logger.error(
                    `Inline inbound processing failed (no Redis): platform=${platform} kind=${event.kind} mid=${event.externalMessageId}: ${err}`
                )
            );
            this.logger.debug(
                `Inbound accepted inline (no Redis): platform=${platform} kind=${event.kind} mid=${event.externalMessageId}`
            );
            return 'accepted';
        }

        const jobId = this.jobId(platform, event.externalMessageId);
        await this.queue.add(
            ENUM_INBOUND_EVENT_PROCESS.INGEST,
            event,
            this.jobOptions(jobId)
        );
        this.logger.debug(
            `Inbound accepted: platform=${platform} kind=${event.kind} mid=${event.externalMessageId}`
        );
        return 'accepted';
    }
}
