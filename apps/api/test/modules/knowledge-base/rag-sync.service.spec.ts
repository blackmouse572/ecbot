import { Test, TestingModule } from '@nestjs/testing';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { RagSyncService } from '@app/modules/knowledge-base/services/rag-sync.service';
import {
    ENUM_RAG_INGEST_PROCESS,
    RAG_INGEST_QUEUE,
} from '@app/modules/knowledge-base/constants/knowledge-ingest.constant';

describe('RagSyncService', () => {
    let service: RagSyncService;
    const enqueueMock = jest.fn().mockResolvedValue(undefined);

    beforeEach(async () => {
        enqueueMock.mockClear();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RagSyncService,
                {
                    provide: CloudTasksQueueClient,
                    useValue: { enqueue: enqueueMock },
                },
            ],
        }).compile();

        service = module.get<RagSyncService>(RagSyncService);
    });

    it('updateChatbotLinks enqueues REINDEX_LINKS job', async () => {
        await service.updateChatbotLinks('item-1', ['c1', 'c2']);
        expect(enqueueMock).toHaveBeenCalledWith(
            RAG_INGEST_QUEUE,
            ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
            { knowledgeItemId: 'item-1', chatbotIds: ['c1', 'c2'] },
            expect.objectContaining({ taskName: expect.any(String) })
        );
    });

    it('deleteByItem enqueues DELETE job', async () => {
        await service.deleteByItem('item-1');
        expect(enqueueMock).toHaveBeenCalledWith(
            RAG_INGEST_QUEUE,
            ENUM_RAG_INGEST_PROCESS.DELETE,
            { knowledgeItemId: 'item-1' },
            expect.objectContaining({ taskName: expect.any(String) })
        );
    });
});
