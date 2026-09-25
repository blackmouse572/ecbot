import { TelegramPlatformAdapter } from '../../../src/modules/platform/adapters/telegram/telegram.platform-adapter';
import { WhatsAppPlatformAdapter } from '../../../src/modules/platform/adapters/whatsapp/whatsapp.platform-adapter';
import { ZaloPlatformAdapter } from '../../../src/modules/platform/adapters/zalo/zalo.platform-adapter';

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const ACCOUNT = { accessToken: 'e', externalId: 'PHONE' } as any;

describe('PlatformAdapter.fetchMedia', () => {
    it('Telegram resolves the file id with getFile, then downloads it', async () => {
        const post = jest.fn().mockResolvedValue({
            data: { ok: true, result: { file_path: 'photos/f.jpg' } },
        });
        const get = jest.fn().mockResolvedValue({
            data: JPEG,
            headers: { 'content-type': 'image/jpeg' },
        });
        const adapter = new TelegramPlatformAdapter(
            {
                get: (k: string) =>
                    k === 'telegram.apiUrl' ? 'https://api.telegram.org' : '',
            } as any,
            { axiosRef: { get, post } } as any,
            { decryptToken: () => 'TOKEN' } as any
        );

        const media = await adapter.fetchMedia(ACCOUNT, {
            type: 'image',
            raw: { file_id: 'F1' },
        });

        expect(post).toHaveBeenCalledWith(
            'https://api.telegram.org/botTOKEN/getFile',
            { file_id: 'F1' }
        );
        expect(get).toHaveBeenCalledWith(
            'https://api.telegram.org/file/botTOKEN/photos/f.jpg',
            { responseType: 'arraybuffer' }
        );
        expect(media).toEqual({ data: JPEG, mime: 'image/jpeg' });
    });

    it('WhatsApp looks the media id up on the Graph API and downloads it with the token', async () => {
        const get = jest
            .fn()
            .mockResolvedValueOnce({
                data: { url: 'https://lookaside/m1', mime_type: 'image/png' },
            })
            .mockResolvedValueOnce({ data: JPEG, headers: {} });
        const adapter = new WhatsAppPlatformAdapter(
            { get: () => undefined } as any,
            { axiosRef: { get, post: jest.fn() } } as any,
            { decryptToken: () => 'TOKEN' } as any
        );

        const media = await adapter.fetchMedia(ACCOUNT, {
            type: 'image',
            raw: { id: 'M1', mime_type: 'image/png' },
        });

        const auth = { headers: { Authorization: 'Bearer TOKEN' } };
        expect(get.mock.calls[0][0]).toMatch(/graph\.facebook\.com\/.*\/M1$/);
        expect(get.mock.calls[0][1]).toEqual(auth);
        expect(get.mock.calls[1]).toEqual([
            'https://lookaside/m1',
            { ...auth, responseType: 'arraybuffer' },
        ]);
        expect(media).toEqual({ data: JPEG, mime: 'image/png' });
    });

    it('platforms with public CDN links (Zalo, Messenger) download the url', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JPEG, {
                headers: { 'content-type': 'image/jpeg' },
            })
        );
        const adapter = new ZaloPlatformAdapter(
            { get: () => undefined } as any,
            { axiosRef: {} } as any,
            {} as any
        );

        const media = await adapter.fetchMedia(ACCOUNT, {
            type: 'image',
            url: 'https://cdn/z.jpg',
        });

        expect(fetchSpy).toHaveBeenCalledWith('https://cdn/z.jpg', {
            signal: expect.any(AbortSignal), // a stuck CDN must not stall the turn
        });
        expect(media).toEqual({ data: JPEG, mime: 'image/jpeg' });
        fetchSpy.mockRestore();
    });

    it('returns null when there is nothing to download', async () => {
        const adapter = new ZaloPlatformAdapter(
            { get: () => undefined } as any,
            { axiosRef: {} } as any,
            {} as any
        );
        await expect(
            adapter.fetchMedia(ACCOUNT, { type: 'image' })
        ).resolves.toBeNull();
    });
});
