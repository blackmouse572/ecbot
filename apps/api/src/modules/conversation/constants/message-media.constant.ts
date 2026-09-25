export const MESSAGE_MEDIA_KEY_PREFIX = 'conversations';

/** Largest inbound image we store; bigger ones keep their platform link only. */
export const MESSAGE_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export const MESSAGE_MEDIA_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
