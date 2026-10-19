import type { ReplyMedia } from '@app/modules/platform/interfaces/message-model';

/**
 * The image or file a reply sends, from an apps/ai `file` part (`send_image`,
 * `send_media`, an allowed markdown image). Null for any other part. The file
 * name and size ride in `providerMetadata.eccho`: the AI SDK keeps nothing
 * else on a file part.
 */
export function mediaFromFilePart(
    part: Record<string, unknown>
): ReplyMedia | null {
    const { type, url, mediaType } = part;
    if (type !== 'file' || typeof url !== 'string') return null;
    if (typeof mediaType !== 'string') return null;
    const meta = (part.providerMetadata as { eccho?: Record<string, unknown> })
        ?.eccho;
    // `image/*` is a send_image or markdown image whose type is not known.
    const known = {
        ...(typeof meta?.size === 'number' && { size: meta.size }),
        ...(mediaType !== 'image/*' && { mimeType: mediaType }),
    };
    if (mediaType.startsWith('image/')) return { url, kind: 'image', ...known };
    return {
        url,
        kind: 'file',
        ...(typeof meta?.filename === 'string' && { name: meta.filename }),
        ...known,
    };
}
