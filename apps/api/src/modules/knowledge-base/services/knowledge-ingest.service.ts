import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import {
    ENUM_RAG_INGEST_PROCESS,
    RAG_INGEST_QUEUE,
} from '../constants/knowledge-ingest.constant';

@Injectable()
export class KnowledgeIngestService {
    private readonly logger = new Logger(KnowledgeIngestService.name);

    constructor(private readonly cloudTasksClient: CloudTasksQueueClient) {}

    async enqueue(knowledgeItemId: string): Promise<void> {
        await this.enqueueMany([knowledgeItemId]);
    }

    /**
     * Enqueue an ingest task per id, replacing any task already queued for the
     * same item. Lists the queue once for the whole batch — `enqueue` in a loop
     * would scan the entire queue per id.
     */
    async enqueueMany(knowledgeItemIds: string[]): Promise<void> {
        if (!knowledgeItemIds.length) {
            return;
        }

        const targets = new Set(knowledgeItemIds);
        const pendingTasks =
            await this.cloudTasksClient.listTasks(RAG_INGEST_QUEUE);

        for (const task of pendingTasks) {
            const payload = task?.payload;
            if (!payload || typeof payload !== 'object') continue;

            if (
                payload.jobName === ENUM_RAG_INGEST_PROCESS.INGEST &&
                targets.has(payload.knowledgeItemId as string)
            ) {
                await this.cloudTasksClient.deleteTask(
                    RAG_INGEST_QUEUE,
                    task.taskName
                );
            }
        }

        for (const knowledgeItemId of targets) {
            await this.cloudTasksClient.enqueue(
                RAG_INGEST_QUEUE,
                ENUM_RAG_INGEST_PROCESS.INGEST,
                { knowledgeItemId },
                { taskName: `rag-ingest-${randomUUID()}` }
            );
            this.logger.log(`enqueued rag ingest for item=${knowledgeItemId}`);
        }
    }
}
