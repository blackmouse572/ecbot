import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';

describe('AwsS3Service ACL defaults', () => {
    const send = jest.fn().mockResolvedValue({ UploadId: 'u' });
    const publicBucket = {
        bucket: 'pub',
        baseUrl: 'https://pub',
        client: { send },
    };
    const privateBucket = {
        bucket: 'priv',
        baseUrl: 'https://priv',
        client: { send },
    };
    const config = {
        get: () => ({ public: publicBucket, private: privateBucket }),
    };
    const service = new AwsS3Service(config as any);

    beforeEach(() => send.mockClear());

    // An upload must never become world-readable unless the caller asks.
    it('puts an object with a private ACL when no ACL is given', async () => {
        await service.putItemWithAcl({
            key: 'a/b.txt',
            file: Buffer.from('x'),
            size: 1,
        });

        expect(send.mock.calls[0][0].input.ACL).toBe('private');
    });

    it('starts a multipart upload with a private ACL when no ACL is given', async () => {
        await service.createMultiPartWithAcl(
            { key: 'a/b.txt', file: Buffer.from('x'), size: 1 },
            2
        );

        expect(send.mock.calls[0][0].input.ACL).toBe('private');
    });

    it('resolves the accessibility of a stored object from its bucket', () => {
        expect(service.getAccessByBucket('priv')).toBe(
            ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
        );
        expect(service.getAccessByBucket('pub')).toBe(
            ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
    });
});
