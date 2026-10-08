import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { RAGWorkspaceController } from '@app/modules/rag/controllers/rag.workspace.controller';

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
});
