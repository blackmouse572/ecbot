import { randomBytes } from 'crypto';
import sharp from 'sharp';
import {
    compactImage,
    compactKey,
    needsCompact,
} from '@app/modules/knowledge-base/utils/knowledge-media-compact.util';

const MB = 1024 * 1024;

/** Random pixels compress badly, so a big one makes a big file. */
const noise = (width: number, height: number) =>
    sharp(randomBytes(width * height * 3), {
        raw: { width, height, channels: 3 },
    });

describe('knowledge media compact copy', () => {
    it.each([
        ['a small jpeg', 'image/jpeg', MB, false],
        ['a small png', 'image/png', 1000, false],
        ['a jpeg over 1MB', 'image/jpeg', MB + 1, true],
        ['a webp of any size', 'image/webp', 1000, true],
        ['a PDF', 'application/pdf', 10 * MB, false],
    ])('%s (%s, %s bytes) needs a copy: %s', (_, mime, size, expected) => {
        expect(needsCompact(mime as string, size as number)).toBe(expected);
    });

    it('sits next to the original as a jpg', () => {
        expect(compactKey('knowledge-media/w/kb/id-banh-mi.webp')).toBe(
            'knowledge-media/w/kb/id-banh-mi-compact.jpg'
        );
    });

    it('turns a webp into a jpeg within 1600px', async () => {
        const webp = await sharp({
            create: {
                width: 2400,
                height: 1200,
                channels: 4,
                background: { r: 200, g: 50, b: 50, alpha: 0.5 },
            },
        })
            .webp()
            .toBuffer();

        const out = await compactImage(webp);

        const meta = await sharp(out).metadata();
        expect(meta.format).toBe('jpeg');
        expect(meta.width).toBe(1600);
        expect(meta.height).toBe(800);
        expect(out.length).toBeLessThanOrEqual(MB);
    });

    it('gets a large noisy png under 1MB', async () => {
        const png = await noise(1600, 1600).png().toBuffer();
        expect(png.length).toBeGreaterThan(MB);

        const out = await compactImage(png);

        expect(out.length).toBeLessThanOrEqual(MB);
        expect((await sharp(out).metadata()).format).toBe('jpeg');
    });

    it('turns the picture upright from its EXIF orientation', async () => {
        const rotated = await sharp({
            create: {
                width: 40,
                height: 20,
                channels: 3,
                background: '#ffffff',
            },
        })
            .jpeg()
            .withMetadata({ orientation: 6 })
            .toBuffer();

        const meta = await sharp(await compactImage(rotated)).metadata();
        expect([meta.width, meta.height]).toEqual([20, 40]);
    });
});
