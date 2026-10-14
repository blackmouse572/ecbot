import {
    ENUM_FILE_MIME,
    ENUM_FILE_MIME_DOCUMENT,
    ENUM_FILE_MIME_IMAGE,
} from '@app/common/file/enums/file.enum';

const MB = 1024 * 1024;

/** Documents a FILE item reads for its text. */
export const KNOWLEDGE_FILE_MIMES: ENUM_FILE_MIME[] = [
    ENUM_FILE_MIME_DOCUMENT.DOCX,
    ENUM_FILE_MIME_DOCUMENT.PDF,
    ENUM_FILE_MIME_DOCUMENT.MD,
    ENUM_FILE_MIME_DOCUMENT.TXT,
    ENUM_FILE_MIME_DOCUMENT.HTML,
];
export const KNOWLEDGE_FILE_MAX_BYTES = 5 * MB;

/** Images a MEDIA item sends as a photo. */
export const KNOWLEDGE_MEDIA_IMAGE_MIMES: ENUM_FILE_MIME[] = [
    ENUM_FILE_MIME_IMAGE.JPG,
    ENUM_FILE_MIME_IMAGE.JPEG,
    ENUM_FILE_MIME_IMAGE.PNG,
    ENUM_FILE_MIME_IMAGE.WEBP,
];
export const KNOWLEDGE_MEDIA_IMAGE_MAX_BYTES = 5 * MB;
/**
 * The compact copy of a media image, for channels that cap photos (Zalo at
 * jpg/png up to 1MB). Images already jpg/png within the cap need none.
 */
export const KNOWLEDGE_MEDIA_COMPACT_MAX_BYTES = 1 * MB;
export const KNOWLEDGE_MEDIA_COMPACT_MIMES: string[] = [
    ENUM_FILE_MIME_IMAGE.JPEG,
    ENUM_FILE_MIME_IMAGE.PNG,
];
export const KNOWLEDGE_MEDIA_COMPACT_MIME = ENUM_FILE_MIME_IMAGE.JPEG;
/** Longest side of the compact copy, in pixels. */
export const KNOWLEDGE_MEDIA_COMPACT_MAX_PX = 1600;
/** JPEG quality to start at, step down by, and stop at before shrinking. */
export const KNOWLEDGE_MEDIA_COMPACT_QUALITY_START = 82;
export const KNOWLEDGE_MEDIA_COMPACT_QUALITY_STEP = 10;
export const KNOWLEDGE_MEDIA_COMPACT_QUALITY_MIN = 52;
/** How much each side shrinks when no quality fits. */
export const KNOWLEDGE_MEDIA_COMPACT_SHRINK = 0.75;
/** Appended to the original key (without its extension). */
export const KNOWLEDGE_MEDIA_COMPACT_KEY_SUFFIX = '-compact.jpg';

/** A PDF menu or brochure, sent as a file; under Messenger's 25MB cap. */
export const KNOWLEDGE_MEDIA_PDF_MAX_BYTES = 20 * MB;

/** The largest upload any item type takes, for the multipart parser. */
export const KNOWLEDGE_UPLOAD_MAX_BYTES = KNOWLEDGE_MEDIA_PDF_MAX_BYTES;
