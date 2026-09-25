import { MessageMediaService } from '../../../src/modules/conversation/services/message-media.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '../../../src/modules/aws/enums/aws.enum';

describe('MessageMediaService', () => {
    const s3 = {
        putItem: jest.fn().mockResolvedValue({}),
        signGetUrl: jest.fn(async (key: string) => `https://s3/${key}?sig`),
    };
    const service = new MessageMediaService(s3 as any);

    beforeEach(() => jest.clearAllMocks());

    it('stores an image privately under the conversation and returns its key', async () => {
        const saved = await service.saveImage('conv-1', {
            data: Buffer.from('x'),
            mime: 'image/png',
        });

        expect(saved).toEqual({
            type: 'image',
            key: expect.stringMatching(/^conversations\/conv-1\/.+\.png$/),
        });
        expect(s3.putItem).toHaveBeenCalledWith(
            { key: saved.key, file: Buffer.from('x'), size: 1 },
            { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
        );
    });

    it('resolves stored keys to presigned urls and keeps plain urls', async () => {
        const out = await service.resolve(
            [
                { type: 'image', key: 'conversations/c/a.jpg' },
                { type: 'image', url: 'https://kb/shirt.jpg' },
                { type: 'video' },
                'junk',
            ],
            'c'
        );

        expect(out).toEqual([
            { type: 'image', url: 'https://s3/conversations/c/a.jpg?sig' },
            { type: 'image', url: 'https://kb/shirt.jpg' },
            { type: 'video' },
        ]);
        expect(s3.signGetUrl).toHaveBeenCalledWith('conversations/c/a.jpg', {
            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
        });
    });

    it('drops the url of an image whose presign fails', async () => {
        s3.signGetUrl.mockRejectedValueOnce(new Error('s3 down'));
        await expect(
            service.resolve(
                [{ type: 'image', key: 'conversations/c/k.jpg' }],
                'c'
            )
        ).resolves.toEqual([{ type: 'image' }]);
    });

    it('never presigns a key outside the conversation folder', async () => {
        await expect(
            service.resolve(
                [
                    { type: 'image', key: 'knowledge/secret.pdf' },
                    { type: 'image', key: 'conversations/other/a.jpg' },
                    { type: 'image', key: 'conversations/c' },
                ],
                'c'
            )
        ).resolves.toEqual([
            { type: 'image' },
            { type: 'image' },
            { type: 'image' },
        ]);
        expect(s3.signGetUrl).not.toHaveBeenCalled();
    });
});
