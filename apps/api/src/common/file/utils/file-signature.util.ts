import { ENUM_FILE_MIME_DOCUMENT } from 'src/common/file/enums/file.enum';

const TEXT_SNIFF_BYTES = 8192;

const startsWith = (buffer: Buffer, signature: string) =>
    buffer.subarray(0, signature.length).toString('latin1') === signature;

// A NUL byte never appears in text (UTF-8 included); it does in binaries.
const looksLikeText = (buffer: Buffer) =>
    !buffer.subarray(0, TEXT_SNIFF_BYTES).includes(0);

const SIGNATURE_CHECKS: Partial<Record<string, (buffer: Buffer) => boolean>> = {
    [ENUM_FILE_MIME_DOCUMENT.PDF]: buffer => startsWith(buffer, '%PDF-'),
    // DOCX is a zip archive.
    [ENUM_FILE_MIME_DOCUMENT.DOCX]: buffer => startsWith(buffer, 'PK\x03\x04'),
    [ENUM_FILE_MIME_DOCUMENT.TXT]: looksLikeText,
    [ENUM_FILE_MIME_DOCUMENT.MD]: looksLikeText,
    [ENUM_FILE_MIME_DOCUMENT.HTML]: looksLikeText,
};

/**
 * Whether the file's bytes fit its declared document type. Types without a
 * check (anything but the knowledge document types) are let through.
 */
export const matchesDeclaredType = (
    mimetype: string,
    buffer: Buffer
): boolean => SIGNATURE_CHECKS[mimetype.toLowerCase()]?.(buffer) ?? true;
