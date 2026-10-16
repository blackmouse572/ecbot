import { UnprocessableEntityException } from '@nestjs/common';
import { EgressBlockedError } from 'src/common/helper/services/helper.egress.service';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import {
    KNOWLEDGE_UPLOAD_MAX_BYTES,
    KNOWLEDGE_UPLOAD_PRESIGN_SECONDS,
} from 'src/modules/knowledge-base/constants/knowledge-upload.constant';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from 'src/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { KnowledgeItemUploadService } from 'src/modules/knowledge-base/services/knowledge-item-upload.service';

// The presigned and URL paths of a FILE/MEDIA item. `store` itself is
// covered through the workspace controller spec.

const PDF = Buffer.from('%PDF-1.4\n%test\n');
const UUID = '0f8b4a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

describe('KnowledgeItemUploadService', () => {
    let s3: {
        presignPutItem: jest.Mock;
        getItemBuffer: jest.Mock;
        deleteItem: jest.Mock;
        getFileInfo: AwsS3Service['getFileInfo'];
    };
    let quota: { assertCanStore: jest.Mock };
    let egress: { fetch: jest.Mock };
    let service: KnowledgeItemUploadService;

    beforeEach(() => {
        s3 = {
            presignPutItem: jest
                .fn()
                .mockResolvedValue({ presignUrl: 'https://s3/put' }),
            getItemBuffer: jest.fn(),
            deleteItem: jest.fn(),
            getFileInfo: AwsS3Service.prototype.getFileInfo,
        };
        quota = { assertCanStore: jest.fn() };
        egress = { fetch: jest.fn() };
        service = new KnowledgeItemUploadService(
            s3 as any,
            quota as any,
            egress as any
        );
    });

    describe('createUploadUrl', () => {
        it('presigns a private PUT under the knowledge base staging folder', async () => {
            const result = await service.createUploadUrl(
                'ws-1',
                'kb-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
                'Bảng giá 2026.pdf',
                1000
            );

            expect(result.fileKey).toMatch(
                /^knowledge-uploads\/ws-1\/kb-1\/[0-9a-f-]{36}-bang-gia-2026\.pdf$/
            );
            expect(result).toMatchObject({
                uploadUrl: 'https://s3/put',
                mimeType: 'application/pdf',
                expiresIn: KNOWLEDGE_UPLOAD_PRESIGN_SECONDS,
            });
            expect(quota.assertCanStore).toHaveBeenCalledWith('ws-1', 1000);
            expect(s3.presignPutItem).toHaveBeenCalledWith(
                result.fileKey,
                1000,
                expect.objectContaining({
                    expired: KNOWLEDGE_UPLOAD_PRESIGN_SECONDS,
                })
            );
        });

        it('refuses a file type the item cannot take before presigning', async () => {
            await expect(
                service.createUploadUrl(
                    'ws-1',
                    'kb-1',
                    ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
                    'clip.mp4',
                    1000
                )
            ).rejects.toThrow(UnprocessableEntityException);
            expect(s3.presignPutItem).not.toHaveBeenCalled();
        });
    });

    describe('readUpload', () => {
        it('reads a staged file and drops the random id from its name', async () => {
            s3.getItemBuffer.mockResolvedValue(PDF);

            const file = await service.readUpload(
                'ws-1',
                'kb-1',
                `knowledge-uploads/ws-1/kb-1/${UUID}-menu.pdf`
            );

            expect(file).toMatchObject({
                originalname: 'menu.pdf',
                mimetype: 'application/pdf',
                size: PDF.length,
            });
        });

        it.each([
            [
                'another knowledge base',
                `knowledge-uploads/ws-1/kb-2/${UUID}-a.pdf`,
            ],
            ['another workspace', `knowledge-uploads/ws-2/kb-1/${UUID}-a.pdf`],
            ['a stored item', 'knowledge-items/ws-1/kb-1/1-a.pdf'],
            ['a path escape', 'knowledge-uploads/ws-1/kb-1/../../ws-2/a.pdf'],
        ])('refuses a key from %s', async (_, key) => {
            await expect(
                service.readUpload('ws-1', 'kb-1', key)
            ).rejects.toMatchObject({
                response: { message: 'knowledgeItem.error.uploadKeyInvalid' },
            });
            expect(s3.getItemBuffer).not.toHaveBeenCalled();
        });

        it('says when nothing was uploaded to the key', async () => {
            s3.getItemBuffer.mockRejectedValue(new Error('NoSuchKey'));

            await expect(
                service.readUpload(
                    'ws-1',
                    'kb-1',
                    `knowledge-uploads/ws-1/kb-1/${UUID}-a.pdf`
                )
            ).rejects.toMatchObject({
                response: { message: 'knowledgeItem.error.uploadNotFound' },
            });
        });
    });

    describe('download', () => {
        it('downloads through the egress guard, capped at the upload limit', async () => {
            egress.fetch.mockResolvedValue(
                new Response(PDF, {
                    headers: { 'content-type': 'application/pdf; charset=x' },
                })
            );

            const file = await service.download(
                'https://shop.vn/files/Bang%20gia.pdf'
            );

            expect(egress.fetch).toHaveBeenCalledWith(
                'https://shop.vn/files/Bang%20gia.pdf',
                {},
                { maxBytes: KNOWLEDGE_UPLOAD_MAX_BYTES }
            );
            expect(file).toMatchObject({
                originalname: 'Bang gia.pdf',
                mimetype: 'application/pdf',
                size: PDF.length,
            });
        });

        it('takes the type from the extension when the server sends octet-stream', async () => {
            egress.fetch.mockResolvedValue(
                new Response(PDF, {
                    headers: { 'content-type': 'application/octet-stream' },
                })
            );

            const file = await service.download('https://shop.vn/menu.pdf');

            expect(file.mimetype).toBe('application/pdf');
        });

        it.each([
            [
                'a blocked address',
                () => Promise.reject(new EgressBlockedError('x')),
            ],
            [
                'an error status',
                () => Promise.resolve(new Response('', { status: 404 })),
            ],
        ])('refuses %s', async (_, result) => {
            egress.fetch.mockImplementation(result);

            await expect(
                service.download('https://shop.vn/menu.pdf')
            ).rejects.toMatchObject({
                response: { message: 'knowledgeItem.error.fileDownloadFailed' },
            });
        });
    });
});
