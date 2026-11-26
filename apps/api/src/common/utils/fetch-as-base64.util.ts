import axios from 'axios';
import sharp from 'sharp';

// Avatars render at 40px or less; 128px covers 3x screens. Platforms send
// pictures up to ~750 KB, which every inbox poll used to pull from the DB.
const AVATAR_SIZE = 128;

/**
 * Downloads an avatar and returns it as a small JPEG data URL, or
 * undefined when the download fails or the bytes aren't an image.
 */
export async function fetchAsBase64(url: string): Promise<string | undefined> {
    if (!url) return undefined;
    try {
        const response = await axios.get<ArrayBuffer>(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
        });
        const jpeg = await sharp(Buffer.from(response.data))
            .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();
        return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    } catch {
        return undefined;
    }
}
