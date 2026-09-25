import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';

describe('AwsS3Service.putItem', () => {
    it('stores the object with the content type of its extension', async () => {
        const send = jest.fn().mockResolvedValue({});
        const bucket = { bucket: 'b', baseUrl: 'https://s3', client: { send } };
        const config = { get: () => ({ public: bucket, private: bucket }) };
        const service = new AwsS3Service(config as any);

        await service.putItem(
            { key: 'conversations/c/a.png', file: Buffer.from('x'), size: 1 },
            { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
        );

        expect(send.mock.calls[0][0].input.ContentType).toBe('image/png');
    });
});
