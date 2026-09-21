import { MikroORM } from '@mikro-orm/core';
import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ContextualWorkerHost } from '@app/common/database/bases/contextual-worker-host';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_QUEUE,
} from '../constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../interfaces/platform-adapter.interface';
import { MessageProcessorService } from '../services/message-processor.service';

/**
 * Drains the Inbound Inbox (ADR-0007): runs each durable inbound event through
 * the Turn pipeline. BullMQ's stalled-job checker re-runs a job whose worker
 * died mid-turn; `process()` is idempotent (upsertByExternalId + debounce
 * jobId), so at-least-once delivery is safe.
 */
@Processor(INBOUND_EVENT_QUEUE, {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_INBOUND ?? '4'),
})
@Injectable()
export class InboundEventProcessor extends ContextualWorkerHost {
    private readonly logger = new Logger(InboundEventProcessor.name);

    constructor(
        private readonly processor: MessageProcessorService,
        orm: MikroORM
    ) {
        super(orm);
    }

    async handle(job: Job<PlatformWebhookEvent>): Promise<void> {
        if (job.name !== ENUM_INBOUND_EVENT_PROCESS.INGEST) return;
        await this.processor.process(job.data);
    }

    // Worker-level errors (e.g. the shared Redis connection dropping mid-job)
    // otherwise become an unhandled rejection with no structured log.
    @OnWorkerEvent('error')
    onError(error: Error): void {
        this.logger.error(
            `Inbound event worker error: ${error.stack ?? error.message}`
        );
    }
}
