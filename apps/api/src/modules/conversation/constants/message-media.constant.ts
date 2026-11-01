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

/** Most photos one chat message may carry (preview, widget, inbox reply). */
export const CHAT_UPLOAD_MAX_IMAGES = 10;

/** Most non-image files one chat message may carry. */
export const CHAT_UPLOAD_MAX_DOCUMENTS = 1;

/** Most attachments of any kind on one chat message. */
export const CHAT_UPLOAD_MAX_FILES =
    CHAT_UPLOAD_MAX_IMAGES + CHAT_UPLOAD_MAX_DOCUMENTS;

/** Largest non-image file a person may attach in a chat we host. */
export const CHAT_UPLOAD_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** Documents a person may attach in a chat we host, by mime, with the
 *  extension the stored copy gets. Images use MESSAGE_MEDIA_EXTENSIONS. */
export const CHAT_UPLOAD_FILE_EXTENSIONS: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
};

/** Where preview chat uploads live, one folder per chatbot. */
export const PREVIEW_MEDIA_KEY_PREFIX = 'preview-media';
