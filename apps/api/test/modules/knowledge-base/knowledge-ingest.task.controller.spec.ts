import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { KnowledgeIngestTaskController } from '@app/modules/knowledge-base/controllers/knowledge-ingest.task.controller';
import { KnowledgeIngestTaskDto } from '@app/modules/knowledge-base/dtos/knowledge-ingest.task.dto';
import { ENUM_RAG_INGEST_PROCESS } from '@app/modules/knowledge-base/constants/knowledge-ingest.constant';

describe('KnowledgeIngestTaskController', () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    let controller: KnowledgeIngestTaskController;

    beforeEach(() => {
        handle.mockReset();
        handle.mockResolvedValue(undefined);
        controller = new KnowledgeIngestTaskController({ handle } as any);
    });

    it.each([
        {
            jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
            knowledgeItemId: 'item-1',
        },
        {
            jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
            knowledgeItemId: 'item-1',
            chatbotIds: ['cb-1'],
        },
        {
            jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
            knowledgeItemId: 'item-1',
        },
    ])(
        'passes the $jobName payload and Cloud Tasks retry count to the handler',
        async dto => {
            await expect(
                controller.handle(dto as any, {
                    'x-cloudtasks-taskretrycount': '2',
                })
            ).resolves.toEqual({});
            expect(handle).toHaveBeenCalledWith(dto, 2);
        }
    );

    it('defaults a missing retry count to zero', async () => {
        const dto = {
            jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
            knowledgeItemId: 'item-1',
        };

        await controller.handle(dto, {});

        expect(handle).toHaveBeenCalledWith(dto, 0);
    });

    it.each([undefined, 'not-a-number'])(
        'normalizes an invalid retry count %p to zero',
        async retryCount => {
            const dto = {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            };

            await controller.handle(dto, {
                'x-cloudtasks-taskretrycount': retryCount as string,
            });

            expect(handle).toHaveBeenCalledWith(dto, 0);
        }
    );

    it('propagates handler failures for Cloud Tasks retry', async () => {
        const error = new Error('AI unavailable');
        handle.mockRejectedValueOnce(error);

        await expect(
            controller.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
                    knowledgeItemId: 'item-1',
                },
                {}
            )
        ).rejects.toBe(error);
    });

    it('validates all three payload shapes with production skipUndefined behavior', async () => {
        const validPayloads = [
            {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            },
            {
                jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                knowledgeItemId: 'item-1',
                chatbotIds: ['cb-1'],
            },
            {
                jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                knowledgeItemId: 'item-1',
                chatbotIds: [],
            },
            {
                jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
                knowledgeItemId: 'item-1',
            },
        ];

        for (const payload of validPayloads) {
            await expect(
                validate(plainToInstance(KnowledgeIngestTaskDto, payload), {
                    skipUndefinedProperties: true,
                })
            ).resolves.toHaveLength(0);
        }

        for (const payload of [
            { knowledgeItemId: 'item-1' },
            { jobName: ENUM_RAG_INGEST_PROCESS.INGEST },
            {
                jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                knowledgeItemId: 'item-1',
                chatbotIds: [''],
            },
            {
                jobName: 'unknown',
                knowledgeItemId: 'item-1',
            },
        ]) {
            await expect(
                validate(plainToInstance(KnowledgeIngestTaskDto, payload), {
                    skipUndefinedProperties: true,
                })
            ).resolves.toEqual(expect.arrayContaining([expect.any(Object)]));
        }
    });
});
