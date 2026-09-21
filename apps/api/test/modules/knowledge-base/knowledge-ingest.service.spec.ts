import { Test } from '@nestjs/testing';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { KnowledgeIngestService } from '@app/modules/knowledge-base/services/knowledge-ingest.service';
import { RagSyncService } from '@app/modules/knowledge-base/services/rag-sync.service';
import {
    RAG_INGEST_QUEUE,
    ENUM_RAG_INGEST_PROCESS,
} from '@app/modules/knowledge-base/constants/knowledge-ingest.constant';

describe('KnowledgeIngestService', () => {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const listTasks = jest.fn().mockResolvedValue([]);
    const deleteTask = jest.fn().mockResolvedValue(undefined);
    let service: KnowledgeIngestService;
    let ragSyncService: RagSyncService;

    beforeEach(async () => {
        enqueue.mockClear();
        listTasks.mockReset();
        listTasks.mockResolvedValue([]);
        deleteTask.mockClear();

        const moduleRef = await Test.createTestingModule({
            providers: [
                KnowledgeIngestService,
                RagSyncService,
                {
                    provide: CloudTasksQueueClient,
                    useValue: { enqueue, listTasks, deleteTask },
                },
            ],
        }).compile();

        service = moduleRef.get(KnowledgeIngestService);
        ragSyncService = moduleRef.get(RagSyncService);
    });

    it('enqueues an ingest task with a nonce task name', async () => {
        await service.enqueue('item-1');

        expect(enqueue).toHaveBeenCalledWith(
            'knowledge-ingest',
            ENUM_RAG_INGEST_PROCESS.INGEST,
            { knowledgeItemId: 'item-1' },
            expect.objectContaining({
                taskName: expect.stringMatching(/^rag-ingest-/),
            })
        );
        expect(enqueue.mock.calls[0][3].taskName).toMatch(
            /^rag-ingest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
    });

    it('uses a new UUID task name across producer calls', async () => {
        await service.enqueue('item-1');
        await service.enqueue('item-1');

        expect(enqueue.mock.calls[0][3].taskName).not.toBe(
            enqueue.mock.calls[1][3].taskName
        );
    });

    it('deletes all pending ingest tasks for the item before creating a replacement', async () => {
        listTasks.mockResolvedValue([
            null,
            { taskName: 'malformed-task', payload: null },
            { taskName: 'missing-payload' },
            {
                taskName: 'old-task-1',
                payload: {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-2',
                },
            },
            {
                taskName: 'other-process',
                payload: {
                    jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
                    knowledgeItemId: 'item-2',
                },
            },
        ]);

        await service.enqueue('item-2');

        expect(deleteTask).toHaveBeenCalledWith(RAG_INGEST_QUEUE, 'old-task-1');
        expect(deleteTask.mock.invocationCallOrder[0]).toBeLessThan(
            enqueue.mock.invocationCallOrder[0]
        );
        expect(deleteTask).toHaveBeenCalledTimes(1);
    });

    it('enqueues reindex tasks with unique names and no schedule delay', async () => {
        await ragSyncService.updateChatbotLinks('item-1', ['cb-1']);

        expect(enqueue).toHaveBeenCalledWith(
            'knowledge-ingest',
            ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
            { knowledgeItemId: 'item-1', chatbotIds: ['cb-1'] },
            expect.objectContaining({
                taskName: expect.stringMatching(
                    /^rag-reindex-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
                ),
            })
        );
        expect(enqueue.mock.calls[0][3]).not.toHaveProperty('scheduleTime');
    });

    it('enqueues delete tasks with unique names and no schedule delay', async () => {
        await ragSyncService.deleteByItem('item-1');

        expect(enqueue).toHaveBeenCalledWith(
            'knowledge-ingest',
            ENUM_RAG_INGEST_PROCESS.DELETE,
            { knowledgeItemId: 'item-1' },
            expect.objectContaining({
                taskName: expect.stringMatching(
                    /^rag-delete-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
                ),
            })
        );
        expect(enqueue.mock.calls[0][3]).not.toHaveProperty('scheduleTime');
    });

    describe('enqueueMany', () => {
        it('scans the queue once for the whole batch', async () => {
            await service.enqueueMany(['a', 'b', 'c']);

            expect(listTasks).toHaveBeenCalledTimes(1);
            expect(listTasks).toHaveBeenCalledWith(RAG_INGEST_QUEUE);
            expect(enqueue).toHaveBeenCalledTimes(3);
        });

        it('drops the pending task of every id it is re-queueing', async () => {
            listTasks.mockResolvedValue([
                {
                    taskName: 'stale-a',
                    payload: {
                        jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                        knowledgeItemId: 'a',
                    },
                },
                {
                    taskName: 'keep-z',
                    payload: {
                        jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                        knowledgeItemId: 'z',
                    },
                },
            ]);

            await service.enqueueMany(['a', 'b']);

            expect(deleteTask).toHaveBeenCalledTimes(1);
            expect(deleteTask).toHaveBeenCalledWith(
                RAG_INGEST_QUEUE,
                'stale-a'
            );
        });

        it('does not touch the queue for an empty batch', async () => {
            await service.enqueueMany([]);

            expect(listTasks).not.toHaveBeenCalled();
            expect(enqueue).not.toHaveBeenCalled();
        });

        it('enqueues an id only once even if it is repeated', async () => {
            await service.enqueueMany(['a', 'a', 'b']);

            expect(enqueue).toHaveBeenCalledTimes(2);
        });
    });
});
