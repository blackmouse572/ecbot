import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import { KnowledgeIngestTaskService } from '@app/modules/knowledge-base/services/knowledge-ingest-task.service';
import {
    ENUM_RAG_INGEST_PROCESS,
    RAG_INGEST_HTTP_TIMEOUT_MS,
    RAG_INGEST_MAX_ATTEMPTS,
    RAG_INGEST_NO_TOKENS_ERROR,
    RAG_INGEST_SENTRY_QUEUE,
    ENUM_KNOWLEDGE_FAILURE_KIND,
} from '@app/modules/knowledge-base/constants/knowledge-ingest.constant';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '@app/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '@app/modules/knowledge-base/enums/knowledge-base-item-status.enum';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { ENUM_AI_USAGE_SOURCE } from '@app/app/ai-usage-meter.interface';

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
    const notifyFailed = jest.fn().mockResolvedValue(undefined);
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
            configService as any,
            { notifyFailed } as any
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
        // Review of #202: apps/ai wraps HTTPException as AppResponse
        // { status, msg, data, error }, with no `detail`.
        [
            {
                response: {
                    data: {
                        status: 400,
                        msg: 'This page is not publicly reachable.',
                        data: null,
                        error: null,
                    },
                },
                message: 'Request failed with status code 400',
            },
            'This page is not publicly reachable.',
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
                // #204: shown to operators as the source name.
                title: 'URL',
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

    // #204: the AI keeps the title so a source reads as the item's name, not
    // the storage file name.
    it('sends the knowledge item title with an uploaded file', async () => {
        findOneById.mockResolvedValue({
            id: 'item-1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
            title: 'Chính sách đổi trả',
            attachment: { key: 'documents/file.pdf', mime: 'application/pdf' },
            knowledgeBase: { id: 'kb-1' },
        });

        await service.handle(
            {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            } as any,
            0
        );

        const form = httpPost.mock.calls[0][1];
        expect(form.getBuffer().toString()).toContain(
            'name="title"\r\n\r\nChính sách đổi trả'
        );
    });

    describe('MEDIA items', () => {
        const media = (extra: Record<string, unknown> = {}) => ({
            id: 'item-1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
            title: 'Banner khai trương',
            attachment: {
                key: 'knowledge-media/ws/kb/b.png',
                mime: 'image/png',
                completedUrl: 'https://s3/b.png',
                cdnUrl: 'https://cdn/b.png',
            },
            knowledgeBase: { id: 'kb-1' },
            ...extra,
        });
        const ingest = () =>
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                0
            );

        beforeEach(() => {
            httpPost.mockReturnValue(
                of({ data: { data: { description: 'A red banner.' } } })
            );
        });

        it('sends the public file and its address to the media index', async () => {
            findOneById.mockResolvedValue(media());
            findByKnowledgeItem.mockResolvedValue([
                { chatbot: { id: 'cb-1' } },
            ]);

            await ingest();

            expect(getItemBuffer).toHaveBeenCalledWith(
                'knowledge-media/ws/kb/b.png',
                { access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC }
            );
            const [url, form] = httpPost.mock.calls[0];
            expect(url).toBe('http://ai.example.test/api/rag/ingest/media');
            const body = form.getBuffer().toString();
            expect(body).toContain('name="url"\r\n\r\nhttps://cdn/b.png');
            expect(body).toContain('name="chatbot_ids"\r\n\r\ncb-1');
            expect(body).not.toContain('name="description"');
        });

        it('keeps the description apps/ai wrote on the item', async () => {
            findOneById.mockResolvedValue(media());

            await ingest();

            expect(updateStatus).toHaveBeenLastCalledWith(
                'item-1',
                expect.objectContaining({
                    status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
                    content: 'A red banner.',
                })
            );
        });

        it("sends the owner's own description instead of asking for one", async () => {
            findOneById.mockResolvedValue(media({ content: 'Áo thun trắng' }));

            await ingest();

            const form = httpPost.mock.calls[0][1];
            expect(form.getBuffer().toString()).toContain(
                'name="description"\r\n\r\nÁo thun trắng'
            );
        });
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

    // #170: rethrowing here let Cloud Tasks retry far past the limit
    // ("attempt=12/3"). The final attempt is acknowledged instead.
    it('marks the item failed, captures Sentry and stops retrying on the final retry', async () => {
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
        ).resolves.toBeUndefined();
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

    it('acknowledges a delivery that arrives past the retry limit', async () => {
        httpPost.mockReturnValue(
            throwError(() =>
                Object.assign(new Error('AI unavailable'), {
                    response: { status: 503 },
                })
            )
        );

        await expect(
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                RAG_INGEST_MAX_ATTEMPTS + 8
            )
        ).resolves.toBeUndefined();
    });

    it('fails a FILE item with no attachment once, without retrying', async () => {
        findOneById.mockResolvedValue({
            id: 'item-1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
            attachment: null,
            knowledgeBase: { id: 'kb-1' },
        });

        await expect(
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                0
            )
        ).resolves.toBeUndefined();
        expect(updateStatus).toHaveBeenLastCalledWith(
            'item-1',
            expect.objectContaining({
                status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            })
        );
    });

    it('stops retrying a delete on the final retry', async () => {
        httpDelete.mockReturnValue(
            throwError(() =>
                Object.assign(new Error('AI unavailable'), {
                    response: { status: 503 },
                })
            )
        );

        await expect(
            service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
                    knowledgeItemId: 'item-1',
                } as any,
                RAG_INGEST_MAX_ATTEMPTS - 1
            )
        ).resolves.toBeUndefined();
    });

    it('preserves the former BullMQ Sentry queue tag literal', () => {
        expect(RAG_INGEST_SENTRY_QUEUE).toBe('RAG_INGEST_QUEUE');
    });

    // The owner is told when knowledge fails, so a broken item is not silent.
    describe('failure notifications', () => {
        const failWith = (status: number, message = 'boom') =>
            throwError(() =>
                Object.assign(new Error(message), { response: { status } })
            );

        it('notifies on a permanent ingest failure', async () => {
            httpPost.mockReturnValue(failWith(400, 'bad document'));
            await service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                    knowledgeItemId: 'item-1',
                } as any,
                0
            );
            expect(notifyFailed).toHaveBeenCalledWith(
                'item-1',
                ENUM_KNOWLEDGE_FAILURE_KIND.INGEST
            );
        });

        it('notifies on the final ingest retry only', async () => {
            httpPost.mockReturnValue(failWith(503));
            const job = {
                jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
                knowledgeItemId: 'item-1',
            } as any;
            await expect(service.handle(job, 0)).rejects.toBeDefined();
            expect(notifyFailed).not.toHaveBeenCalled();
            await expect(
                service.handle(job, RAG_INGEST_MAX_ATTEMPTS - 1)
            ).resolves.toBeUndefined();
            expect(notifyFailed).toHaveBeenCalledWith(
                'item-1',
                ENUM_KNOWLEDGE_FAILURE_KIND.INGEST
            );
        });

        it('notifies when a link sync fails permanently', async () => {
            httpPatch.mockReturnValue(failWith(400));
            await service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                    knowledgeItemId: 'item-1',
                    chatbotIds: ['cb-1'],
                } as any,
                0
            );
            expect(notifyFailed).toHaveBeenCalledWith(
                'item-1',
                ENUM_KNOWLEDGE_FAILURE_KIND.LINK_SYNC
            );
        });

        it('notifies when a link sync still fails on the final retry', async () => {
            httpPatch.mockReturnValue(failWith(503));
            const job = {
                jobName: ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS,
                knowledgeItemId: 'item-1',
                chatbotIds: ['cb-1'],
            } as any;
            await expect(service.handle(job, 0)).rejects.toBeDefined();
            expect(notifyFailed).not.toHaveBeenCalled();
            await expect(
                service.handle(job, RAG_INGEST_MAX_ATTEMPTS - 1)
            ).resolves.toBeUndefined();
            expect(notifyFailed).toHaveBeenCalledWith(
                'item-1',
                ENUM_KNOWLEDGE_FAILURE_KIND.LINK_SYNC
            );
        });

        it('does not notify when deleting a removed item fails', async () => {
            httpDelete.mockReturnValue(failWith(400));
            await service.handle(
                {
                    jobName: ENUM_RAG_INGEST_PROCESS.DELETE,
                    knowledgeItemId: 'item-1',
                } as any,
                0
            );
            expect(notifyFailed).not.toHaveBeenCalled();
        });
    });

    // #250: embedding a knowledge document is metered against the workspace.
    describe('usage meter', () => {
        const meter = { check: jest.fn(), record: jest.fn() };
        const ingestDto = {
            jobName: ENUM_RAG_INGEST_PROCESS.INGEST,
            knowledgeItemId: 'item-1',
        } as any;

        beforeEach(() => {
            meter.record.mockResolvedValue(undefined);
            findOneById.mockResolvedValue({
                id: 'item-1',
                type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
                content: 'content',
                title: 'Title',
                knowledgeBase: { id: 'kb-1', workspace: { id: 'ws-1' } },
            });
            service = new KnowledgeIngestTaskService(
                { findOneById, updateStatus } as any,
                { findByKnowledgeItem } as any,
                { getItemBuffer } as any,
                { post: httpPost, patch: httpPatch, delete: httpDelete } as any,
                configService as any,
                { notifyFailed } as any,
                meter as any
            );
        });

        it('records the embedding tokens apps/ai reports', async () => {
            meter.check.mockResolvedValue({ allowed: true });
            httpPost.mockReturnValue(
                of({
                    data: {
                        data: {
                            chunk_count: 2,
                            embedding_model: 'google/gemini-embedding-001',
                            usage: {
                                input_tokens: 900,
                                output_tokens: 0,
                                total_tokens: 900,
                            },
                        },
                    },
                })
            );

            await service.handle(ingestDto, 0);

            expect(findOneById).toHaveBeenCalledWith('item-1', {
                populate: ['knowledgeBase'],
            });
            expect(meter.check).toHaveBeenCalledWith('ws-1');
            expect(meter.record).toHaveBeenCalledWith({
                workspaceId: 'ws-1',
                usage: { inputTokens: 900, outputTokens: 0, totalTokens: 900 },
                source: ENUM_AI_USAGE_SOURCE.KNOWLEDGE_INGEST,
                model: 'google/gemini-embedding-001',
            });
        });

        it('still completes the item when recording the usage fails', async () => {
            meter.check.mockResolvedValue({ allowed: true });
            meter.record.mockRejectedValue(new Error('db down'));
            httpPost.mockReturnValue(
                of({
                    data: {
                        data: {
                            chunk_count: 2,
                            usage: {
                                input_tokens: 9,
                                output_tokens: 0,
                                total_tokens: 9,
                            },
                        },
                    },
                })
            );

            await expect(service.handle(ingestDto, 0)).resolves.toBeUndefined();

            expect(updateStatus).toHaveBeenLastCalledWith(
                'item-1',
                expect.objectContaining({
                    status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
                })
            );
        });

        it('fails the item with a message the owner can act on when the workspace is out of tokens', async () => {
            meter.check.mockResolvedValue({
                allowed: false,
                reason: 'QUOTA_EXHAUSTED',
            });

            await expect(service.handle(ingestDto, 0)).resolves.toBeUndefined();

            expect(httpPost).not.toHaveBeenCalled();
            expect(meter.record).not.toHaveBeenCalled();
            expect(updateStatus).toHaveBeenCalledTimes(1);
            expect(updateStatus).toHaveBeenCalledWith('item-1', {
                status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
                errorMessage: RAG_INGEST_NO_TOKENS_ERROR,
            });
            expect(notifyFailed).toHaveBeenCalledWith(
                'item-1',
                ENUM_KNOWLEDGE_FAILURE_KIND.INGEST
            );
        });
    });
});
