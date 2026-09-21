import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import {
    CUSTOMER_TAG_CLASSIFIER_DEBOUNCE_MS,
    CUSTOMER_TAG_CLASSIFIER_QUEUE,
    ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS,
} from '../constants/customer-tag-classifier.constant';

/**
 * Schedules the analytical Customer-tag classifier (#170).
 *
 * Two entry points:
 *  - `scheduleAfterMessage`: debounced 30-min window after each inbound message.
 *    Re-scheduling on a newer message replaces any pending task for the same
 *    conversation so we never run on a stale snapshot.
 *  - `scheduleOnResolved`: fires immediately when a conversation is resolved,
 *    again replacing any pending debounced job.
 *
 * `snapshotKey` is computed from `lastMessageAt + status`. The processor will
 * re-check this against the live conversation before classifying, so an
 * out-of-band update between schedule + run is treated as "stale" and skipped.
 */
@Injectable()
export class CustomerTagClassifierService {
    private readonly logger = new Logger(CustomerTagClassifierService.name);

    constructor(
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly conversationRepository: ConversationRepository
    ) {}

    /**
     * Build the snapshot key for a conversation. Two jobs scheduled for the
     * same (lastMessageAt, status) tuple are logically equivalent; if the
     * key drifts between schedule and run, the processor knows the snapshot
     * has moved on and bails out.
     */
    private buildSnapshotKey(
        lastMessageAt: Date | undefined,
        status: string
    ): string {
        const ts = lastMessageAt ? lastMessageAt.toISOString() : 'null';
        return `${ts}:${status}`;
    }

    private async resolveSnapshotKey(
        conversationId: string
    ): Promise<string | null> {
        const conv =
            await this.conversationRepository.findOneById(conversationId);
        if (!conv) return null;
        return this.buildSnapshotKey(conv.lastMessageAt, conv.status);
    }

    private async clearExisting(conversationId: string): Promise<void> {
        const pendingTasks = await this.cloudTasksClient.listTasks(
            CUSTOMER_TAG_CLASSIFIER_QUEUE
        );
        for (const task of pendingTasks ?? []) {
            const payload = task?.payload;
            if (
                !task ||
                typeof task.taskName !== 'string' ||
                !task.taskName ||
                !payload ||
                typeof payload !== 'object' ||
                Array.isArray(payload)
            ) {
                continue;
            }

            if (
                (payload as Record<string, unknown>).jobName ===
                    ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY &&
                (payload as Record<string, unknown>).conversationId ===
                    conversationId
            ) {
                await this.cloudTasksClient.deleteTask(
                    CUSTOMER_TAG_CLASSIFIER_QUEUE,
                    task.taskName
                );
            }
        }
    }

    private taskName(conversationId: string): string {
        return `classify-${conversationId}-${randomUUID()}`;
    }

    async scheduleAfterMessage(
        conversationId: string,
        _lastMessageAt: Date
    ): Promise<void> {
        const snapshotKey = await this.resolveSnapshotKey(conversationId);
        if (!snapshotKey) {
            this.logger.debug(
                `scheduleAfterMessage: conversation ${conversationId} not found`
            );
            return;
        }
        await this.clearExisting(conversationId);
        await this.cloudTasksClient.enqueue(
            CUSTOMER_TAG_CLASSIFIER_QUEUE,
            ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
            { conversationId, snapshotKey },
            {
                taskName: this.taskName(conversationId),
                scheduleTime: new Date(
                    Date.now() + CUSTOMER_TAG_CLASSIFIER_DEBOUNCE_MS
                ),
            }
        );
        this.logger.debug(
            `Scheduled classify (debounced 30m) conv=${conversationId} key=${snapshotKey}`
        );
    }

    async scheduleOnResolved(conversationId: string): Promise<void> {
        const snapshotKey = await this.resolveSnapshotKey(conversationId);
        if (!snapshotKey) {
            this.logger.debug(
                `scheduleOnResolved: conversation ${conversationId} not found`
            );
            return;
        }
        await this.clearExisting(conversationId);
        await this.cloudTasksClient.enqueue(
            CUSTOMER_TAG_CLASSIFIER_QUEUE,
            ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
            { conversationId, snapshotKey },
            {
                taskName: this.taskName(conversationId),
                scheduleTime: new Date(),
            }
        );
        this.logger.debug(
            `Scheduled classify (immediate / resolved) conv=${conversationId} key=${snapshotKey}`
        );
    }

    /** Exposed for the processor's idempotency check. */
    buildSnapshotKeyFor(
        lastMessageAt: Date | undefined,
        status: string
    ): string {
        return this.buildSnapshotKey(lastMessageAt, status);
    }
}
