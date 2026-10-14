import { AdapterCapabilities } from '../interfaces/message-model';

const MB = 1024 * 1024;

/** Budget for downloading one inbound attachment from a platform CDN. */
export const MEDIA_FETCH_TIMEOUT_MS = 10_000;

/** Sent in place of an image apps/ai could not describe (no url, a failed
 *  fetch or a blocked description), so the agent knows a photo arrived. */
export const UNVIEWABLE_IMAGE_NOTE =
    '[The user sent an image that could not be viewed.]';

/** How a burst image's description reads in the Turn's message. */
export const imageDescriptionNote = (description: string): string =>
    `[Image description: ${description}]`;

/** Size assumed for outbound media we know nothing about (a `send_image`
 *  URL): the largest image a knowledge upload accepts. */
export const MEDIA_UNKNOWN_SIZE_BYTES = 5 * MB;

/** Mime of outbound media from its URL extension, when apps/ai sent none. */
export const MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
};

/** The largest PDF Zalo OA takes; also caps the download before upload. */
export const ZALO_FILE_MAX_BYTES = 5 * MB;

/** What Zalo OA takes: photos as jpg/png up to 1MB, PDFs up to 5MB. */
export const ZALO_MEDIA_LIMITS: AdapterCapabilities['mediaLimits'] = {
    image: { mimes: ['image/jpeg', 'image/png'], maxBytes: MB },
    file: { mimes: ['application/pdf'], maxBytes: ZALO_FILE_MAX_BYTES },
};

/** What the WhatsApp Cloud API takes: jpg/png photos up to 5MB (no webp),
 *  documents up to 100MB. */
export const WHATSAPP_MEDIA_LIMITS: AdapterCapabilities['mediaLimits'] = {
    image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 5 * MB },
    file: { mimes: ['application/pdf'], maxBytes: 100 * MB },
};
