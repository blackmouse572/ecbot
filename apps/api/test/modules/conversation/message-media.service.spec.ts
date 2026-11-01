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
            {
                key: saved.key,
                file: Buffer.from('x'),
                size: 1,
                mime: 'image/png',
            },
            { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
        );
    });

    it('resolves stored keys to presigned urls and keeps plain urls', async () => {
        const out = await service.resolve(
            [
                { type: 'image', key: 'conversations/c/a.jpg' },
                { type: 'image', url: 'https://kb/shirt.jpg' },
                { type: 'video' },
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

    describe('saveUpload', () => {
        const upload = (
            mimetype: string,
            size: number,
            originalname = 'a'
        ) => ({
            buffer: Buffer.alloc(size),
            mimetype,
            size,
            originalname,
        });

        it('stores an image privately under the folder', async () => {
            const saved = await service.saveUpload(
                'preview-media/cb1',
                upload('image/png', 10, 'shirt.png')
            );

            expect(saved).toEqual({
                type: 'image',
                key: expect.stringMatching(/^preview-media\/cb1\/.+\.png$/),
                name: 'shirt.png',
            });
            expect(s3.putItem).toHaveBeenCalledWith(
                expect.objectContaining({ key: saved?.key, mime: 'image/png' }),
                { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
            );
        });

        it('stores a document as a file with its extension', async () => {
            const saved = await service.saveUpload(
                'conversations/c',
                upload('application/pdf', 10, 'menu.pdf')
            );

            expect(saved).toEqual({
                type: 'file',
                key: expect.stringMatching(/^conversations\/c\/.+\.pdf$/),
                name: 'menu.pdf',
            });
        });

        it('refuses a type it does not take, or an oversized file', async () => {
            await expect(
                service.saveUpload('f', upload('application/x-msdownload', 10))
            ).resolves.toBeUndefined();
            await expect(
                service.saveUpload('f', upload('image/png', 6 * 1024 * 1024))
            ).resolves.toBeUndefined();
            await expect(
                service.saveUpload(
                    'f',
                    upload('application/pdf', 11 * 1024 * 1024)
                )
            ).resolves.toBeUndefined();
            expect(s3.putItem).not.toHaveBeenCalled();
        });
    });

    it('resolves keys only inside the given folder', async () => {
        await expect(
            service.resolveIn(
                [
                    { type: 'image', key: 'preview-media/cb1/a.jpg' },
                    {
                        type: 'file',
                        key: 'preview-media/cb2/b.pdf',
                        name: 'b.pdf',
                    },
                ],
                'preview-media/cb1/'
            )
        ).resolves.toEqual([
            { type: 'image', url: 'https://s3/preview-media/cb1/a.jpg?sig' },
            { type: 'file', name: 'b.pdf' },
        ]);
    });

    describe('adopt', () => {
        it('copies staged uploads into the conversation folder', async () => {
            const s3WithCopy = { ...s3, copyItem: jest.fn(async () => {}) };
            const media = new MessageMediaService(s3WithCopy as any);

            const out = await media.adopt('widget-media/acc/v1', 'conv-1', [
                { key: 'widget-media/acc/v1/a.jpg', name: 'shirt.jpg' },
                { key: 'widget-media/acc/other/c.jpg' },
                { key: 'widget-media/acc/v1/b.jpg', name: 'pants.jpg' },
            ]);

            expect(out).toEqual([
                {
                    type: 'image',
                    key: expect.stringMatching(
                        /^conversations\/conv-1\/.+\.jpg$/
                    ),
                    name: 'shirt.jpg',
                },
                {
                    type: 'image',
                    key: expect.stringMatching(
                        /^conversations\/conv-1\/.+\.jpg$/
                    ),
                    name: 'pants.jpg',
                },
            ]);
            expect(s3WithCopy.copyItem).toHaveBeenCalledTimes(2);
            expect(s3WithCopy.copyItem).toHaveBeenCalledWith(
                'widget-media/acc/v1/a.jpg',
                out[0].key,
                { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
            );
        });

        it('keeps one file and drops photos sent with it', async () => {
            const s3WithCopy = { ...s3, copyItem: jest.fn(async () => {}) };
            const media = new MessageMediaService(s3WithCopy as any);

            const out = await media.adopt('widget-media/acc/v1', 'conv-1', [
                { key: 'widget-media/acc/v1/b.pdf', name: 'menu.pdf' },
                { key: 'widget-media/acc/v1/a.jpg' },
            ]);

            expect(out).toEqual([
                expect.objectContaining({ type: 'file', name: 'menu.pdf' }),
            ]);
            expect(s3WithCopy.copyItem).toHaveBeenCalledTimes(1);
        });
    });
});
