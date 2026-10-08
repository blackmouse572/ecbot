import { createHash } from 'crypto';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_QUEUE,
} from '../constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../interfaces/platform-adapter.interface';
import { InboundEventDedupeService } from './inbound-event-dedupe.service';
import { MessageProcessorService } from './message-processor.service';

/**
 * Inbound Inbox (ADR-0008). The intake seam of the webhook → reply flow:
 * `accept` makes a received platform message durable by creating a Cloud Task
 * BEFORE the webhook ACK. Cloud Tasks then POSTs it to InboundEventTaskController,
 * which runs the Turn pipeline (MessageProcessorService.process) inside that
 * HTTP request, so the Turn gets full CPU even on a scale-to-zero instance.
 *
 * A failed enqueue throws, so the webhook returns 5xx and the platform
 * redelivers (receipt-before-ACK). Only when Cloud Tasks isn't configured at
 * all (no project, no emulator) is the Turn fired inline, fire-and-forget.
 */
@Injectable()
export class InboundInboxService {
    private readonly logger = new Logger(InboundInboxService.name);

    constructor(
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly dedupe: InboundEventDedupeService,
        private readonly messageProcessor: MessageProcessorService
    ) {}

    /**
     * Deterministic per (platform, message), so a platform redelivery creates
     * the same task name and Cloud Tasks rejects it as ALREADY_EXISTS (the
     * client treats that as success). Hashed because task names allow only
     * [A-Za-z0-9_-] and platform ids don't (WhatsApp `wamid.…==`), and a
     * hashed name spreads load across Cloud Tasks' key range.
     */
    private taskName(
        platform: ENUM_ACCOUNT_TYPE,
        externalMessageId: string
    ): string {
        return createHash('sha256')
            .update(`${platform}:${externalMessageId}`)
            .digest('hex');
    }

    /**
     * Durably enqueue one inbound event. Returns 'ignored' for events with no
     * externalMessageId (read receipts, delivery, typing): they carry no dedup
     * key and the Turn pipeline ignores them anyway.
     *
     * Throws if the enqueue fails so the controller can return 5xx and let the
     * platform retry.
     */
    async accept(
        platform: ENUM_ACCOUNT_TYPE,
        event: PlatformWebhookEvent
    ): Promise<'accepted' | 'ignored'> {
        const mid = event.externalMessageId;
        if (!mid) return 'ignored';

        // Already enqueued within the dedupe window (a redelivery, or the
        // hourly reconciliation re-accepting recent messages).
        if (!(await this.dedupe.claimEnqueue(platform, mid))) {
            this.logger.debug(
                `Inbound already enqueued: platform=${platform} mid=${mid}`
            );
            return 'accepted';
        }

        if (!this.cloudTasksClient.isConfigured()) {
            this.messageProcessor
                .process(event)
                .catch(err =>
                    this.logger.error(
                        `Inline inbound processing failed (no Cloud Tasks): platform=${platform} kind=${event.kind} mid=${mid}: ${err}`
                    )
                );
            return 'accepted';
        }

        const taskName = this.taskName(platform, mid);
        try {
            await this.cloudTasksClient.enqueue(
                INBOUND_EVENT_QUEUE,
                ENUM_INBOUND_EVENT_PROCESS.INGEST,
                { event },
                { taskName }
            );
        } catch (err: unknown) {
            await this.dedupe.releaseEnqueue(platform, mid);
            throw err;
        }

        this.logger.debug(
            `Inbound accepted: platform=${platform} kind=${event.kind} mid=${mid} task=${taskName}`
        );
        return 'accepted';
    }
}
