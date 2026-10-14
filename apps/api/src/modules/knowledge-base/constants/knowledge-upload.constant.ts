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
/** A PDF menu or brochure, sent as a file; under Messenger's 25MB cap. */
export const KNOWLEDGE_MEDIA_PDF_MAX_BYTES = 20 * MB;

/** The largest upload any item type takes, for the multipart parser. */
export const KNOWLEDGE_UPLOAD_MAX_BYTES = KNOWLEDGE_MEDIA_PDF_MAX_BYTES;
