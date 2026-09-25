export const MESSAGE_MEDIA_KEY_PREFIX = 'conversations';

/**
 * Largest inbound image we download and store; bigger ones keep their
 * platform link only. KEEP IN SYNC with apps/ai `VISION_MAX_IMAGE_BYTES` —
 * a stored image larger than that would never be described.
 */
export const MESSAGE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const MESSAGE_MEDIA_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
