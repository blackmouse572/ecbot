import { AwsS3Service } from '../../../src/modules/aws/services/aws.s3.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '../../../src/modules/aws/enums/aws.enum';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(async () => 'https://s3/signed'),
}));

describe('AwsS3Service.signGetUrl', () => {
    it('signs a download url without a HEAD round trip', async () => {
        const send = jest.fn();
        const service = new AwsS3Service({
            get: (k: string) =>
                k === 'aws.s3.presignExpired'
                    ? 1800
                    : {
                          public: { client: { send } },
                          private: { bucket: 'b', client: { send } },
                      },
        } as any);

        await expect(
            service.signGetUrl('conversations/c/a.jpg', {
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            })
        ).resolves.toBe('https://s3/signed');
        expect(send).not.toHaveBeenCalled();
    });
});
