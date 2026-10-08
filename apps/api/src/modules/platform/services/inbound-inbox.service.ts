import { createHash } from 'crypto';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_QUEUE,
} from '../constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../interfaces/platform-adapter.interface';
import { MessageProcessorService } from './message-processor.service';

/**
 * Inbound Inbox (ADR-0008). The intake seam of the webhook → reply flow:
 * `accept` makes a received platform message durable by creating a Cloud Task
 * BEFORE the webhook ACK. Cloud Tasks then POSTs it to InboundEventTaskController,
 * which runs the Turn pipeline (MessageProcessorService.process) inside that
 * HTTP request, so the Turn gets full CPU even on a scale-to-zero instance.
 *
 * Falls back to firing the Turn directly when the task can't be created
 * (Cloud Tasks unreachable): same fire-and-forget shape as the task path's
 * fast ACK, so an outage doesn't also turn every webhook into a slow request
 * that risks the platform's timeout. This loses receipt-before-ACK and retry;
 * the inbound dedupe claim inside `process()` still protects against a
 * platform redelivery causing duplicate side effects.
 */
@Injectable()
export class InboundInboxService {
    private readonly logger = new Logger(InboundInboxService.name);

    constructor(
        private readonly cloudTasksClient: CloudTasksQueueClient,
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
     */
    async accept(
        platform: ENUM_ACCOUNT_TYPE,
        event: PlatformWebhookEvent
    ): Promise<'accepted' | 'ignored'> {
        if (!event.externalMessageId) return 'ignored';

        const taskName = this.taskName(platform, event.externalMessageId);
        try {
            await this.cloudTasksClient.enqueue(
                INBOUND_EVENT_QUEUE,
                ENUM_INBOUND_EVENT_PROCESS.INGEST,
                { event },
                { taskName }
            );
        } catch (err: unknown) {
            this.logger.error(
                `Inbound enqueue failed, running Turn inline: platform=${platform} kind=${event.kind} mid=${event.externalMessageId}: ${err}`
            );
            this.messageProcessor
                .process(event)
                .catch(turnErr =>
                    this.logger.error(
                        `Inline inbound processing failed: platform=${platform} kind=${event.kind} mid=${event.externalMessageId}: ${turnErr}`
                    )
                );
            return 'accepted';
        }

        this.logger.debug(
            `Inbound accepted: platform=${platform} kind=${event.kind} mid=${event.externalMessageId} task=${taskName}`
        );
        return 'accepted';
    }
}
