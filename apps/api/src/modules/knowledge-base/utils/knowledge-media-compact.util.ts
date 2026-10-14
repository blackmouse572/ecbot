import sharp from 'sharp';
import {
    KNOWLEDGE_MEDIA_COMPACT_KEY_SUFFIX,
    KNOWLEDGE_MEDIA_COMPACT_MAX_BYTES,
    KNOWLEDGE_MEDIA_COMPACT_MAX_PX,
    KNOWLEDGE_MEDIA_COMPACT_MIMES,
    KNOWLEDGE_MEDIA_COMPACT_QUALITY_MIN,
    KNOWLEDGE_MEDIA_COMPACT_QUALITY_START,
    KNOWLEDGE_MEDIA_COMPACT_QUALITY_STEP,
    KNOWLEDGE_MEDIA_COMPACT_SHRINK,
} from '../constants/knowledge-upload.constant';

/** Whether a media image needs a compact copy: anything but a jpg/png that
 *  already fits the cap. PDFs never do. */
export function needsCompact(mime: string, size: number): boolean {
    if (!mime.startsWith('image/')) return false;
    return (
        !KNOWLEDGE_MEDIA_COMPACT_MIMES.includes(mime) ||
        size > KNOWLEDGE_MEDIA_COMPACT_MAX_BYTES
    );
}

/** Where the compact copy is stored: next to the original. */
export function compactKey(key: string): string {
    return key.replace(/\.[^/.]+$/, '') + KNOWLEDGE_MEDIA_COMPACT_KEY_SUFFIX;
}

/**
 * A JPEG of the image within the cap: upright per EXIF, inside 1600px,
 * transparency on white, quality stepping down, then smaller sides until it
 * fits.
 */
export async function compactImage(image: Buffer): Promise<Buffer> {
    for (
        let side = KNOWLEDGE_MEDIA_COMPACT_MAX_PX;
        side >= 1;
        side = Math.floor(side * KNOWLEDGE_MEDIA_COMPACT_SHRINK)
    ) {
        for (
            let quality = KNOWLEDGE_MEDIA_COMPACT_QUALITY_START;
            quality >= KNOWLEDGE_MEDIA_COMPACT_QUALITY_MIN;
            quality -= KNOWLEDGE_MEDIA_COMPACT_QUALITY_STEP
        ) {
            const out = await sharp(image)
                .rotate()
                .resize(side, side, { fit: 'inside', withoutEnlargement: true })
                .flatten({ background: '#ffffff' })
                .jpeg({ quality })
                .toBuffer();
            if (out.length <= KNOWLEDGE_MEDIA_COMPACT_MAX_BYTES) return out;
        }
    }
    throw new Error('Image could not be made small enough');
}
