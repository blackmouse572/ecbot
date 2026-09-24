import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import { KnowledgeIngestTaskService } from '@app/modules/knowledge-base/services/knowledge-ingest-task.service';
import {
    ENUM_RAG_INGEST_PROCESS,
    RAG_INGEST_HTTP_TIMEOUT_MS,
    RAG_INGEST_MAX_ATTEMPTS,
    RAG_INGEST_SENTRY_QUEUE,
} from '@app/modules/knowledge-base/constants/knowledge-ingest.constant';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '@app/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '@app/modules/knowledge-base/enums/knowledge-base-item-status.enum';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));
jest.mock('@app/common/utils/gcp-id-token.util', () => ({
    getInternalAuthHeader: jest
        .fn()
        .mockResolvedValue({ Authorization: 'Bearer gcp-id-token' }),
}));

describe('KnowledgeIngestTaskService', () => {
    const findOneById = jest.fn();
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const findByKnowledgeItem = jest.fn().mockResolvedValue([]);
    const httpPost = jest.fn();
    const httpPatch = jest.fn();
    const httpDelete = jest.fn();
    const getItemBuffer = jest.fn();
    const configService = {
        get: jest.fn((key: string) =>
            key === 'ai.internalToken'
                ? 'internal-token'
                : 'http://ai.example.test'
        ),
    };
    let service: KnowledgeIngestTaskService;

    beforeEach(() => {
        jest.clearAllMocks();
        configService.get.mockImplementation((key: string) =>
            key === 'ai.internalToken'
                ? 'internal-token'
                : 'http://ai.example.test'
        );
        findOneById.mockResolvedValue({
            id: 'item-1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
            content: 'content',
            title: 'Title',
            metadata: { source: 'test' },
        });
        findByKnowledgeItem.mockResolvedValue([]);
        getItemBuffer.mockResolvedValue(Buffer.from('file'));
        httpPost.mockReturnValue(of({ data: { data: { chunk_count: 2 } } }));
        httpPatch.mockReturnValue(of({ data: {} }));
        httpDelete.mockReturnValue(of({ data: {} }));

        service = new KnowledgeIngestTaskService(
            { findOneById, updateStatus } as any,
            { findByKnowledgeItem } as any,
            { getItemBuffer } as any,
            { post: httpPost, patch: httpPatch, delete: httpDelete } as any,
            configService as any
        );
    });

    it.each([
        [{ response: { status: 400 } }, 'permanent'],
        [{ response: { status: 403 } }, 'permanent'],
        [{ response: { status: 413 } }, 'permanent'],
        [{ response: { status: 408 } }, 'transient'],
        [{ response: { status: 429 } }, 'transient'],
        [{ response: { status: 502 } }, 'transient'],
        [{ response: { status: 503 } }, 'transient'],
        [{ response: { status: 504 } }, 'transient'],
        [{ code: 'ECONNREFUSED' }, 'transient'],
        [{ response: { status: undefined } }, 'transient'],
    ])('classifies %p as %s', async (error, expected) => {
        const { classifyIngestError } =
            await import('@app/modules/knowledge-base/services/knowledge-ingest-task.service');

        expect(classifyIngestError(error)).toBe(expected);
    });

    it.each([
        [
            { response: { data: { detail: 'URL ingest failed: boom' } } },
            'URL ingest failed: boom',
        ],
        [
            { response: { data: { detail: '' } }, message: 'axios message' },
            'axios message',
        ],
        [
            { response: { data: { detail: [{ msg: 'bad url' }] } } },
            JSON.stringify([{ msg: 'bad url' }]),
        ],
        [
            { message: 'Request failed with status code 502' },
            'Request failed with status code 502',
        ],
        ['plain string error', 'plain string error'],
    ])('extracts message from %p as %p', async (error, expected) => {
        const { extractIngestErrorMessage } =
            await import('@app/modules/knowledge-base/services/knowledge-ingest-task.service');

        expect(extractIngestErrorMessage(error)).toBe(expected);
    });

    it('skips an ingest task when its knowledge item no longer exists', async () => {
        findOneById.mockResolvedValue(null);

        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            } as any,
            0
        );

        expect(updateStatus).not.toHaveBeenCalled();
        expect(httpPost).not.toHaveBeenCalled();
    });

    it('ingests text and records processing and completed status', async () => {
        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            } as any,
            0
        );

        expect(httpPost).toHaveBeenCalledWith(
            'http://ai.example.test/api/rag/ingest/text',
            {
                knowledge_item_id: 'item-1',
                text: 'content',
                title: 'Title',
                chatbot_ids: [],
                knowledge_base_id: undefined,
            },
            {
                timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                    'Content-Type': 'application/json',
                },
            }
        );
        expect(updateStatus).toHaveBeenNthCalledWith(1, 'item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING,
            errorMessage: null,
        });
        expect(updateStatus).toHaveBeenNthCalledWith(
            2,
            'item-1',
            expect.objectContaining({
                status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
                errorMessage: null,
                metadata: { source: 'test', chunkCount: 2 },
            })
        );
    });

    it('ingests URLs with the expected AI payload and HTTP options', async () => {
        findOneById.mockResolvedValue({
            id: 'item-1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL,
            content: 'https://example.test/doc',
            title: 'URL',
        });

        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            } as any,
            0
        );

        expect(httpPost).toHaveBeenCalledWith(
            'http://ai.example.test/api/rag/ingest/url',
            expect.objectContaining({
                url: 'https://example.test/doc',
                knowledge_item_id: 'item-1',
                chatbot_ids: [],
            }),
            expect.objectContaining({
                timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                    'Content-Type': 'application/json',
                },
            })
        );
    });

    it('ingests files from private S3 storage with multipart request options', async () => {
        findOneById.mockResolvedValue({
            id: 'item-1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
            attachment: {
                key: 'documents/file.pdf',
                mime: 'application/pdf',
            },
            knowledgeBase: { id: 'kb-1' },
        });
        findByKnowledgeItem.mockResolvedValue([{ chatbot: { id: 'cb-1' } }]);

        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            } as any,
            0
        );

        expect(getItemBuffer).toHaveBeenCalledWith('documents/file.pdf', {
            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
        });
        expect(httpPost).toHaveBeenCalledWith(
            'http://ai.example.test/api/rag/ingest/upload',
            expect.any(Object),
            expect.objectContaining({
                timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                headers: expect.objectContaining({
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                }),
                maxBodyLength: Infinity,
            })
        );
    });

    it('dispatches reindex-links with timeout, auth, and chatbot IDs', async () => {
        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                knowledgeItemId: 'item-1',
                chatbotIds: ['cb-1'],
            } as any,
            0
        );

        expect(httpPatch).toHaveBeenCalledWith(
            'http://ai.example.test/api/rag/documents/by-item/item-1/chatbots',
            { chatbot_ids: ['cb-1'] },
            {
                timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                    'Content-Type': 'application/json',
                },
            }
        );
    });

    it('dispatches final unlink reindex with an empty chatbot list', async () => {
        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                knowledgeItemId: 'item-1',
                chatbotIds: [],
            } as any,
            0
        );

        expect(httpPatch).toHaveBeenCalledWith(
            'http://ai.example.test/api/rag/documents/by-item/item-1/chatbots',
            { chatbot_ids: [] },
            expect.any(Object)
        );
    });

    it('dispatches delete with timeout and auth headers', async () => {
        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
                knowledgeItemId: 'item-1',
            } as any,
            0
        );

        expect(httpDelete).toHaveBeenCalledWith(
            'http://ai.example.test/api/rag/documents/by-item/item-1',
            {
                timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                    'Content-Type': 'application/json',
                },
            }
        );
    });

    it.each([
        [ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS, 'patch'],
        [ENUM_RAG_INGEST_PROCESS.DELETE, 'delete'],
    ])('acknowledges permanent %s failures', async (jobName, method) => {
        const error = Object.assign(new Error('bad request'), {
            response: { status: 400 },
        });
        const request = method === 'patch' ? httpPatch : httpDelete;
        request.mockReturnValue(throwError(() => error));

        await expect(
            service.handle(
                {
                    jobName,
                    knowledgeItemId: 'item-1',
                    ...(jobName === ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS
                        ? { chatbotIds: ['cb-1'] }
                        : {}),
                } as any,
                0
            )
        ).resolves.toBeUndefined();
    });

    it.each([
        [ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS, 'patch'],
        [ENUM_RAG_INGEST_PROCESS.DELETE, 'delete'],
    ])(
        'throws transient %s failures for Cloud Tasks retry',
        async (jobName, method) => {
            const error = Object.assign(new Error('AI unavailable'), {
                response: { status: 503 },
            });
            const request = method === 'patch' ? httpPatch : httpDelete;
            request.mockReturnValue(throwError(() => error));

            await expect(
                service.handle(
                    {
                        jobName,
                        knowledgeItemId: 'item-1',
                        ...(jobName === ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS
                            ? { chatbotIds: ['cb-1'] }
                            : {}),
                    } as any,
                    0
                )
            ).rejects.toBe(error);
        }
    );

    it('acknowledges permanent ingest failures without throwing', async () => {
        const error = Object.assign(new Error('bad document'), {
            response: { status: 400 },
        });
        httpPost.mockReturnValue(throwError(() => error));

        await expect(
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                0
            )
        ).resolves.toBeUndefined();
        expect(updateStatus).toHaveBeenLastCalledWith('item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'bad document',
        });
    });

    it('throws transient ingest failures before the final retry', async () => {
        const error = Object.assign(new Error('AI unavailable'), {
            response: { status: 503 },
        });
        httpPost.mockReturnValue(throwError(() => error));

        await expect(
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                RAG_INGEST_MAX_ATTEMPTS - 2
            )
        ).rejects.toBe(error);
        expect(updateStatus).not.toHaveBeenLastCalledWith('item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'AI unavailable',
        });
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('marks the item failed and captures Sentry on the final retry', async () => {
        const error = Object.assign(new Error('AI unavailable'), {
            response: { status: 503 },
        });
        httpPost.mockReturnValue(throwError(() => error));

        await expect(
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                RAG_INGEST_MAX_ATTEMPTS - 1
            )
        ).rejects.toBe(error);
        expect(updateStatus).toHaveBeenLastCalledWith('item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'AI unavailable',
        });
        expect(Sentry.captureException).toHaveBeenCalledWith(error, {
            tags: {
                queue: RAG_INGEST_SENTRY_QUEUE,
                knowledge_item_id: 'item-1',
            },
        });
    });

    it('preserves the former BullMQ Sentry queue tag literal', () => {
        expect(RAG_INGEST_SENTRY_QUEUE).toBe('RAG_INGEST_QUEUE');
    });
});
