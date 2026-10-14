/**
 * A file a reply sends, read from an apps/ai UI stream `file` part: an image
 * (`send_image`, `send_media`) or a PDF (`send_media`). AI SDK v5 file parts
 * carry only url, mediaType and providerMetadata, so `send_media` puts the
 * item's title, size and compact copy under `providerMetadata.ecbot`.
 */
export interface IMediaPart {
    url: string;
    /** The file's mime. Absent for `send_image`, which only says `image/*`. */
    mime?: string;
    filename?: string;
    size?: number;
    /** The JPG copy under 1MB the API made at upload, for capped channels. */
    compact?: { url: string; mime: string; size: number };
}

/** The raw `providerMetadata.ecbot` shape apps/ai puts on the wire. */
interface IWireEcbotMedia {
    filename?: unknown;
    size?: unknown;
    compact?: { url?: unknown; mediaType?: unknown; size?: unknown } | null;
}

const PDF_MIME = 'application/pdf';
const ANY_IMAGE = 'image/*';

/** The media a `file` frame sends, or null when it is not an image or PDF. */
export function parseWireMediaPart(
    frame: Record<string, unknown>
): IMediaPart | null {
    const { type, url, mediaType } = frame;
    if (
        type !== 'file' ||
        typeof url !== 'string' ||
        typeof mediaType !== 'string' ||
        !(mediaType.startsWith('image/') || mediaType === PDF_MIME)
    )
        return null;
    const ecbot = (frame.providerMetadata as { ecbot?: IWireEcbotMedia })
        ?.ecbot;
    const compact = ecbot?.compact;
    return {
        url,
        ...(mediaType !== ANY_IMAGE && { mime: mediaType }),
        ...(typeof ecbot?.filename === 'string' && {
            filename: ecbot.filename,
        }),
        ...(typeof ecbot?.size === 'number' && { size: ecbot.size }),
        ...(typeof compact?.url === 'string' &&
            typeof compact.mediaType === 'string' &&
            typeof compact.size === 'number' && {
                compact: {
                    url: compact.url,
                    mime: compact.mediaType,
                    size: compact.size,
                },
            }),
    };
}
