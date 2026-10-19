import { ConfigService } from '@nestjs/config';
import {
    GetObjectCommand,
    NotFound,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/url'),
}));

describe('AwsS3Service', () => {
    let service: AwsS3Service;
    let send: jest.Mock;

    beforeEach(() => {
        send = jest.fn().mockResolvedValue({});
        const bucket = {
            bucket: 'private-bucket',
            baseUrl: 'https://private.example',
            client: { send },
        };
        const config = {
            get: (key: string) =>
                key === 'aws.s3.presignExpired'
                    ? 1800
                    : { public: bucket, private: bucket },
        } as unknown as ConfigService;
        service = new AwsS3Service(config);
        (getSignedUrl as jest.Mock).mockClear();
    });

    describe('presignGetItem', () => {
        it('signs the URL so the browser renders the file inline with its mime type', async () => {
            await service.presignGetItem('knowledge/kb-1/policy.pdf', {
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            });

            const command = (getSignedUrl as jest.Mock).mock
                .calls[0][1] as GetObjectCommand;
            expect(command.input).toMatchObject({
                Key: 'knowledge/kb-1/policy.pdf',
                ResponseContentType: 'application/pdf',
                ResponseContentDisposition: 'inline',
            });
        });
    });

    describe('presignPutItem', () => {
        // Every header the URL signs must be sent back by the uploader, so
        // a plain `curl -T file "<url>"` only works with none beyond the length.
        it('signs no encryption header, so a plain PUT of the file works', async () => {
            send.mockRejectedValueOnce(
                new NotFound({ message: 'not found', $metadata: {} })
            );

            await service.presignPutItem('knowledge-uploads/a.pdf', 10, {
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            });

            const command = (getSignedUrl as jest.Mock).mock
                .calls[0][1] as PutObjectCommand;
            expect(command.input).toEqual({
                Bucket: 'private-bucket',
                Key: 'knowledge-uploads/a.pdf',
                ContentType: 'application/pdf',
                ContentLength: 10,
            });
        });
    });
});
