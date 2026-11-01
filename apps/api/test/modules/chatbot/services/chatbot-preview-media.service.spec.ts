import { ChatbotPreviewMediaService } from '../../../../src/modules/chatbot/services/chatbot-preview-media.service';

describe('ChatbotPreviewMediaService', () => {
    const media = {
        saveUpload: jest.fn(async () => ({ type: 'image', key: 'k' })),
        resolveIn: jest.fn(
            async (attachments: { type: string; key?: string }[]) =>
                attachments.map(a => ({
                    type: a.type,
                    url: `https://s3/${a.key}`,
                }))
        ),
    };
    const ai = {
        describeImages: jest.fn(
            async ({ images }: { images: { id: string }[] }) => ({
                images: images.map(i => ({
                    id: i.id,
                    description: `photo ${i.id}`,
                })),
                usage: { inputTokens: 300 },
                model: 'google/gemini-2.5-flash',
            })
        ),
    };
    const service = new ChatbotPreviewMediaService(media as never, ai as never);

    beforeEach(() => jest.clearAllMocks());

    it('stores an upload in the chatbot preview folder', async () => {
        const upload = {
            buffer: Buffer.from('x'),
            mimetype: 'image/png',
            size: 1,
            originalname: 'a.png',
        };
        await service.save('cb1', upload);
        expect(media.saveUpload).toHaveBeenCalledWith(
            'preview-media/cb1',
            upload
        );
    });

    it('refuses a file it could not store', async () => {
        media.saveUpload.mockResolvedValueOnce(undefined as never);
        await expect(
            service.save('cb1', {
                buffer: Buffer.from('x'),
                mimetype: 'application/x-msdownload',
                size: 1,
                originalname: 'a.exe',
            })
        ).rejects.toThrow();
        await expect(service.save('cb1', undefined)).rejects.toThrow();
    });

    it('describes photos in one call like a channel does', async () => {
        const out = await service.notes('cb1', [
            { key: 'preview-media/cb1/a.jpg' },
        ]);

        expect(ai.describeImages).toHaveBeenCalledWith({
            chatbot_id: 'cb1',
            images: [{ id: '0', url: 'https://s3/preview-media/cb1/a.jpg' }],
        });
        expect(out).toEqual({
            notes: ['[Image description: photo 0]'],
            usage: { inputTokens: 300 },
            model: 'google/gemini-2.5-flash',
        });
    });

    it('notes a file like a channel does', async () => {
        const out = await service.notes('cb1', [
            { key: 'preview-media/cb1/b.pdf', name: 'menu.pdf' },
        ]);

        expect(ai.describeImages).not.toHaveBeenCalled();
        expect(out.notes).toEqual(['[File, which you cannot open]']);
    });

    it('keeps either the first file or up to ten photos', async () => {
        const images = Array.from({ length: 11 }, (_, i) => ({
            key: `preview-media/cb1/${i}.jpg`,
        }));
        const photos = await service.notes('cb1', [
            ...images,
            { key: 'preview-media/cb1/a.pdf' },
        ]);
        expect(photos.notes).toHaveLength(10);
        expect(photos.notes).not.toContain('[File, which you cannot open]');

        const file = await service.notes('cb1', [
            { key: 'preview-media/cb1/a.pdf' },
            ...images,
        ]);
        expect(file.notes).toEqual(['[File, which you cannot open]']);
    });

    it('ignores keys outside the chatbot folder', async () => {
        const out = await service.notes('cb1', [
            { key: 'preview-media/cb2/a.jpg' },
            { key: 'conversations/c/a.jpg' },
        ]);
        expect(out).toEqual({ notes: [] });
        expect(ai.describeImages).not.toHaveBeenCalled();
    });

    it('says an image could not be viewed when describing fails', async () => {
        ai.describeImages.mockRejectedValueOnce(new Error('ai down'));
        const out = await service.notes('cb1', [
            { key: 'preview-media/cb1/a.png' },
        ]);
        expect(out).toEqual({
            notes: ['[The user sent an image that could not be viewed.]'],
        });
    });
});
