import { UnprocessableEntityException } from '@nestjs/common';
import { POLICY_ROLE_META_KEY } from '@app/modules/policy/constants/policy.constant';
import { KnowledgeItemWorkspaceController } from '@app/modules/knowledge-base/controllers/knowledge-item.workspace.controller';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '@app/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { KnowledgeItemUploadService } from '@app/modules/knowledge-base/services/knowledge-item-upload.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';

// A FILE item sent without a file used to be created (201) and only failed
// later at ingest (#162). It is a request error, so it is refused up front.
describe('KnowledgeItemWorkspaceController.create', () => {
    let controller: KnowledgeItemWorkspaceController;
    let em: { fork: jest.Mock };
    let knowledgeItemService: { create: jest.Mock };
    let knowledgeStorageQuotaService: { assertCanStore: jest.Mock };

    const user = { id: 'user-1' } as any;
    const workspace = { id: 'workspace-1' } as any;

    let awsS3Service: { putItem: jest.Mock };

    beforeEach(() => {
        const session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        em = { fork: jest.fn(() => session) };
        knowledgeItemService = { create: jest.fn() };
        knowledgeStorageQuotaService = { assertCanStore: jest.fn() };
        awsS3Service = { putItem: jest.fn() };
        controller = new KnowledgeItemWorkspaceController(
            em as any,
            knowledgeItemService as any,
            { findOne: jest.fn().mockResolvedValue({ id: 'kb-1' }) } as any,
            {} as any,
            {} as any,
            { findOne: jest.fn().mockResolvedValue(null) } as any,
            {} as any,
            {} as any,
            new KnowledgeItemUploadService(
                awsS3Service as any,
                knowledgeStorageQuotaService as any,
                {} as any
            )
        );
    });

    it('refuses a file that would pass the plan storage limit, before saving anything', async () => {
        const refusal = new UnprocessableEntityException({
            message: 'knowledgeItem.error.storageLimitExceeded',
        });
        knowledgeStorageQuotaService.assertCanStore.mockRejectedValue(refusal);

        const result = controller.create(
            user,
            workspace,
            'kb-1',
            { type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE, title: 'x' } as any,
            {
                originalname: 'menu.pdf',
                size: 1234,
                mimetype: 'application/pdf',
                buffer: Buffer.from('%PDF-1.4'),
            } as any
        );

        await expect(result).rejects.toBe(refusal);
        expect(
            knowledgeStorageQuotaService.assertCanStore
        ).toHaveBeenCalledWith('workspace-1', 1234);
        expect(awsS3Service.putItem).not.toHaveBeenCalled();
        expect(knowledgeItemService.create).not.toHaveBeenCalled();
    });

    it('refuses a FILE item with no file attached (422)', async () => {
        const result = controller.create(
            user,
            workspace,
            'kb-1',
            { type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE, title: 'x' } as any,
            undefined
        );

        await expect(result).rejects.toBeInstanceOf(
            UnprocessableEntityException
        );
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                message: 'knowledgeItem.error.fileRequired',
            },
        });
        expect(em.fork).not.toHaveBeenCalled();
        expect(knowledgeItemService.create).not.toHaveBeenCalled();
    });
});

// MEDIA items are images or PDFs the agent sends to customers, so they are
// stored where the channels can fetch them, and only those types are taken.
describe('KnowledgeItemWorkspaceController.create (MEDIA)', () => {
    const user = { id: 'user-1' } as any;
    const workspace = { id: 'workspace-1' } as any;
    const MB = 1024 * 1024;
    let controller: KnowledgeItemWorkspaceController;
    let session: Record<string, jest.Mock>;
    let knowledgeItemService: Record<string, jest.Mock>;
    let awsS3Service: { putItem: jest.Mock };

    const file = (mimetype: string, size = 1000) =>
        ({
            originalname: 'Bánh mì đặc biệt.png',
            mimetype,
            size,
            buffer: Buffer.from('%PDF-1.4'),
        }) as any;
    const create = (type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE, upload?: any) =>
        controller.create(
            user,
            workspace,
            'kb-1',
            { type, title: 'Bánh mì' } as any,
            upload
        );

    beforeEach(() => {
        session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        knowledgeItemService = {
            create: jest
                .fn()
                .mockResolvedValue({ id: 'item-1', type: 'MEDIA' }),
            mapShort: jest.fn().mockReturnValue({ id: 'item-1' }),
        };
        awsS3Service = {
            putItem: jest.fn().mockResolvedValue({
                bucket: 'public-bucket',
                key: 'k',
                completedUrl: 'https://s3/k',
                cdnUrl: 'https://cdn/k',
            }),
        };
        controller = new KnowledgeItemWorkspaceController(
            { fork: () => session } as any,
            knowledgeItemService as any,
            { findOne: jest.fn().mockResolvedValue({ id: 'kb-1' }) } as any,
            {} as any,
            { createByUser: jest.fn() } as any,
            { findOne: jest.fn().mockResolvedValue(null) } as any,
            {} as any,
            {} as any,
            new KnowledgeItemUploadService(
                awsS3Service as any,
                { assertCanStore: jest.fn() } as any,
                {} as any
            )
        );
    });

    it('stores an image in the public bucket, where channels can fetch it', async () => {
        await create(ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA, file('image/png'));

        const [put, options] = awsS3Service.putItem.mock.calls[0];
        expect(options).toEqual({ access: 'PUBLIC' });
        expect(put.mime).toBe('image/png');
        expect(put.key).toMatch(
            /^knowledge-media\/workspace-1\/kb-1\/[0-9a-f-]{36}-banh-mi-.+\.png$/
        );
        expect(knowledgeItemService.create.mock.calls[0][0]).toMatchObject({
            type: 'MEDIA',
            attachment: { cdnUrl: 'https://cdn/k', mime: 'image/png' },
        });
    });

    it('takes a PDF menu up to 20MB', async () => {
        await create(
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
            file('application/pdf', 19 * MB)
        );
        expect(awsS3Service.putItem).toHaveBeenCalled();
    });

    it('ignores a file sent with a TEXT or URL item', async () => {
        await create(ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT, file('image/png'));

        expect(awsS3Service.putItem).not.toHaveBeenCalled();
        expect(
            knowledgeItemService.create.mock.calls[0][0].attachment
        ).toBeUndefined();
    });

    it.each([
        ['a MEDIA item with no file', 'MEDIA', undefined, 'fileRequired'],
        [
            'a document as MEDIA',
            'MEDIA',
            file('text/plain'),
            'mediaTypeInvalid',
        ],
        ['an image as FILE', 'FILE', file('image/png'), 'fileTypeInvalid'],
        [
            'an image over 5MB',
            'MEDIA',
            file('image/png', 6 * MB),
            'fileTooLarge',
        ],
        [
            'a FILE over 5MB',
            'FILE',
            file('application/pdf', 6 * MB),
            'fileTooLarge',
        ],
    ])('refuses %s (422)', async (_, type, upload, key) => {
        const result = create(type as ENUM_KNOWLEDGE_BASE_ITEM_TYPE, upload);

        await expect(result).rejects.toMatchObject({
            response: { message: `knowledgeItem.error.${key}` },
        });
        expect(awsS3Service.putItem).not.toHaveBeenCalled();
    });
});

describe('KnowledgeItemWorkspaceController delete routes', () => {
    // A member deletes knowledge items through their role's KNOWLEDGE_BASE
    // delete permission, as on every other delete route. Every member's
    // global role type is USER, so a role-type requirement here meant only
    // super admins could delete.
    it.each(['delete', 'batchDelete'] as const)(
        '%s does not require a global role type',
        handler => {
            expect(
                Reflect.getMetadata(
                    POLICY_ROLE_META_KEY,
                    KnowledgeItemWorkspaceController.prototype[handler]
                )
            ).toBeUndefined();
        }
    );
});

describe('KnowledgeItemWorkspaceController.batchTag', () => {
    it('adds the tags to each item and reports a missing one as failed', async () => {
        const session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        const service = {
            findOne: jest.fn(async ({ id }: { id: string }) =>
                id === 'a' ? { id: 'a', type: 'TEXT', title: 'A' } : null
            ),
            addTags: jest.fn().mockResolvedValue(undefined),
        };
        const kbService = {
            findOne: jest.fn().mockResolvedValue({ id: 'kb' }),
        };
        const controller = new KnowledgeItemWorkspaceController(
            { fork: () => session } as any,
            service as any,
            kbService as any,
            {} as any,
            { createByUser: jest.fn() } as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );

        const { data } = await controller.batchTag(
            { id: 'u' } as any,
            { id: 'w' } as any,
            'kb',
            { ids: ['a', 'b'], tags: ['FAQ'] }
        );

        expect(data.succeeded).toEqual(['a']);
        expect(data.failed.map(f => f.id)).toEqual(['b']);
        expect(service.addTags).toHaveBeenCalledWith('a', ['FAQ'], {
            em: session,
            actionBy: 'u',
        });
    });
});
