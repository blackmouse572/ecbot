import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';

describe('AwsS3Service.putItem', () => {
    const send = jest.fn().mockResolvedValue({});
    const bucket = { bucket: 'b', baseUrl: 'https://s3', client: { send } };
    const config = { get: () => ({ public: bucket, private: bucket }) };
    const service = new AwsS3Service(config as any);

    beforeEach(() => send.mockClear());

    it('stores the object with the content type the caller gives', async () => {
        await service.putItem(
            {
                key: 'conversations/c/a.webp',
                file: Buffer.from('x'),
                size: 1,
                mime: 'image/webp',
            },
            { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
        );

        expect(send.mock.calls[0][0].input.ContentType).toBe('image/webp');
    });

    // Avatar keys carry the uploaded file name, so guessing from the
    // extension would serve an `x.html` upload as a web page.
    it('does not guess a content type from the key', async () => {
        await service.putItem({
            key: 'user/avatar/u_1_x.html',
            file: Buffer.from('x'),
            size: 1,
        });

        expect(send.mock.calls[0][0].input.ContentType).toBeUndefined();
    });
});
