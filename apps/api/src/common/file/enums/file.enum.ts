export enum ENUM_FILE_TYPE {
    AUDIO = 'audio',
    IMAGE = 'image',
    EXCEL = 'excel',
    VIDEO = 'video',
}

export enum ENUM_FILE_MIME_IMAGE {
    JPG = 'image/jpg',
    JPEG = 'image/jpeg',
    PNG = 'image/png',
}

export enum ENUM_FILE_MIME_DOCUMENT {
    PDF = 'application/pdf',
    EPUB = 'application/epub+zip',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    TXT = 'text/plain',
    HTML = 'text/html',
    MD = 'text/markdown',
}

export enum ENUM_FILE_MIME_EXCEL {
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV = 'text/csv',
}

export enum ENUM_FILE_MIME_AUDIO {
    MPEG = 'audio/mpeg',
    M4A = 'audio/m4a',
    MP3 = 'audio/mp3',
}

export enum ENUM_FILE_MIME_VIDEO {
    MP4 = 'video/mp4',
}

export const ENUM_FILE_MIME = {
    ...ENUM_FILE_MIME_IMAGE,
    ...ENUM_FILE_MIME_DOCUMENT,
    ...ENUM_FILE_MIME_EXCEL,
    ...ENUM_FILE_MIME_AUDIO,
    ...ENUM_FILE_MIME_VIDEO,
};

export type ENUM_FILE_MIME =
    | ENUM_FILE_MIME_IMAGE
    | ENUM_FILE_MIME_DOCUMENT
    | ENUM_FILE_MIME_EXCEL
    | ENUM_FILE_MIME_AUDIO
    | ENUM_FILE_MIME_VIDEO;

// Mime → file-extension mapping for storage keys (e.g. S3 uploads). Covers the
// document mimes the upload endpoints accept.
export const EXTENSION_BY_MIME: Record<ENUM_FILE_MIME_DOCUMENT, string> = {
    [ENUM_FILE_MIME_DOCUMENT.PDF]: 'pdf',
    [ENUM_FILE_MIME_DOCUMENT.EPUB]: 'epub',
    [ENUM_FILE_MIME_DOCUMENT.DOCX]: 'docx',
    [ENUM_FILE_MIME_DOCUMENT.TXT]: 'txt',
    [ENUM_FILE_MIME_DOCUMENT.HTML]: 'html',
    [ENUM_FILE_MIME_DOCUMENT.MD]: 'md',
};
