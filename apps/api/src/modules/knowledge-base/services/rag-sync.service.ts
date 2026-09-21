import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import {
    ENUM_RAG_INGEST_PROCESS,
    RAG_INGEST_QUEUE,
} from '../constants/knowledge-ingest.constant';

@Injectable()
export class RagSyncService {
    private readonly logger = new Logger(RagSyncService.name);

    constructor(private readonly cloudTasksClient: CloudTasksQueueClient) {}

    async updateChatbotLinks(
        knowledgeItemId: string,
        chatbotIds: string[]
    ): Promise<void> {
        await this.cloudTasksClient.enqueue(
            RAG_INGEST_QUEUE,
            ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
            { knowledgeItemId, chatbotIds },
            { taskName: `rag-reindex-${randomUUID()}` }
        );
        this.logger.debug(
            `Enqueued ${ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS} job for item=${knowledgeItemId}`
        );
    }

    async deleteByItem(knowledgeItemId: string): Promise<void> {
        await this.cloudTasksClient.enqueue(
            RAG_INGEST_QUEUE,
            ENUM_RAG_INGEST_PROCESS.DELETE,
            { knowledgeItemId },
            { taskName: `rag-delete-${randomUUID()}` }
        );
        this.logger.debug(
            `Enqueued ${ENUM_RAG_INGEST_PROCESS.DELETE} job for item=${knowledgeItemId}`
        );
    }
}
