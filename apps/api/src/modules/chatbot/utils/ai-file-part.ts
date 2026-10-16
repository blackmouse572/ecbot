import type { ReplyMedia } from '@app/modules/platform/interfaces/message-model';

/**
 * The image or file a reply sends, from an apps/ai `file` part (`send_image`,
 * `send_media`, an allowed markdown image). Null for any other part. The file
 * name rides in `providerMetadata.eccho`: the AI SDK keeps nothing else on a
 * file part.
 */
export function mediaFromFilePart(
    part: Record<string, unknown>
): ReplyMedia | null {
    const { type, url, mediaType } = part;
    if (type !== 'file' || typeof url !== 'string') return null;
    if (typeof mediaType !== 'string') return null;
    if (mediaType.startsWith('image/')) return { url, kind: 'image' };
    const meta = (part.providerMetadata as { eccho?: Record<string, unknown> })
        ?.eccho;
    return {
        url,
        kind: 'file',
        ...(typeof meta?.filename === 'string' && { name: meta.filename }),
    };
}
