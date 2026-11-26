import axios from 'axios';
import sharp from 'sharp';
import { fetchAsBase64 } from 'src/common/utils/fetch-as-base64.util';

jest.mock('axios');

// A noisy 1000x1000 PNG, so it doesn't compress away like a flat colour.
async function bigPng(): Promise<Buffer> {
    const size = 1000;
    const raw = Buffer.alloc(size * size * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919) % 256;
    return sharp(raw, { raw: { width: size, height: size, channels: 3 } })
        .png()
        .toBuffer();
}

function decode(dataUrl: string): Buffer {
    return Buffer.from(dataUrl.split(',')[1], 'base64');
}

describe('fetchAsBase64', () => {
    const get = axios.get as jest.Mock;

    afterEach(() => get.mockReset());

    it('stores a large avatar as a small 128px JPEG', async () => {
        get.mockResolvedValue({
            data: await bigPng(),
            headers: { 'content-type': 'image/png' },
        });

        const result = await fetchAsBase64('https://cdn.example/avatar.png');

        expect(result).toMatch(/^data:image\/jpeg;base64,/);
        const meta = await sharp(decode(result!)).metadata();
        expect(meta.width).toBe(128);
        expect(meta.height).toBe(128);
        expect(result!.length).toBeLessThan(20_000);
        expect(get).toHaveBeenCalledWith('https://cdn.example/avatar.png', {
            responseType: 'arraybuffer',
            timeout: 5000,
        });
    });

    it('returns undefined for a falsy URL', async () => {
        await expect(fetchAsBase64('')).resolves.toBeUndefined();
        expect(get).not.toHaveBeenCalled();
    });

    it('returns undefined when the bytes are not an image', async () => {
        get.mockResolvedValue({
            data: Buffer.from('<html>not an image</html>'),
            headers: { 'content-type': 'text/html' },
        });

        await expect(
            fetchAsBase64('https://cdn.example/avatar.png')
        ).resolves.toBeUndefined();
    });

    it('returns undefined when the download fails', async () => {
        get.mockRejectedValue(new Error('timeout'));

        await expect(
            fetchAsBase64('https://cdn.example/avatar.png')
        ).resolves.toBeUndefined();
    });
});
