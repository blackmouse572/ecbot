import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { RAGWorkspaceController } from '@app/modules/rag/controllers/rag.workspace.controller';
import { BadRequestException } from '@nestjs/common';

describe('RAGWorkspaceController file storage', () => {
    const awsS3Service = {
        presignPutItem: jest.fn().mockResolvedValue({}),
        mapPresign: jest.fn().mockReturnValue({ key: 'k' }),
    };
    const ragService = {
        generateS3Key: jest.fn().mockReturnValue('rag/k.pdf'),
    };
    const controller = new RAGWorkspaceController(
        ragService as any,
        awsS3Service as any,
        {} as any,
        {} as any,
        {} as any
    );

    // Customer documents must not land in the public bucket.
    it('presigns uploads into the private bucket', async () => {
        await controller.uploadFile({ id: 'w1' } as any, 'c1', {
            size: 10,
        } as any);

        expect(awsS3Service.presignPutItem).toHaveBeenCalledWith(
            'rag/k.pdf',
            10,
            expect.objectContaining({
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            })
        );
    });

    // The private bucket also holds other tenants' media and knowledge files,
    // and deleting a RAG entry deletes its stored key.
    describe('createWithFile key check', () => {
        const session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        const rag = {
            generateS3Key: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'r1' }),
            mapGet: jest.fn().mockReturnValue({ id: 'r1' }),
        };
        const activity = { createByUser: jest.fn() };
        const ctrl = new RAGWorkspaceController(
            rag as any,
            awsS3Service as any,
            {} as any,
            activity as any,
            { fork: () => session } as any
        );
        const body = (key: string) =>
            ({ chatbot: 'c1', attachment: { key, size: 10 } }) as any;

        beforeEach(() => jest.clearAllMocks());

        it.each([
            'rag/w2/c1/doc.pdf',
            'rag/w1/c2/doc.pdf',
            'media/w1/secret.png',
            'rag/w1/c1/../../w2/c1/doc.pdf',
            'rag/w1/c1/sub/doc.pdf',
        ])(
            'rejects a key outside rag/<workspace>/<chatbot>/: %s',
            async key => {
                await expect(
                    ctrl.createWithFile({ id: 'w1' } as any, 'c1', body(key), {
                        id: 'u1',
                    } as any)
                ).rejects.toBeInstanceOf(BadRequestException);
                expect(rag.create).not.toHaveBeenCalled();
            }
        );

        it('accepts the key upload-file generated', async () => {
            await ctrl.createWithFile(
                { id: 'w1' } as any,
                'c1',
                body('rag/w1/c1/price-list.pdf'),
                { id: 'u1' } as any
            );

            expect(rag.create).toHaveBeenCalled();
        });
    });
});
