import { ENUM_FILE_MIME_DOCUMENT } from 'src/common/file/enums/file.enum';

const TEXT_SNIFF_BYTES = 8192;
// PDF readers accept the header anywhere in the first 1024 bytes.
const PDF_HEADER_WINDOW = 1024;

const TEXT_TYPES: ReadonlySet<string> = new Set([
    ENUM_FILE_MIME_DOCUMENT.TXT,
    ENUM_FILE_MIME_DOCUMENT.MD,
    ENUM_FILE_MIME_DOCUMENT.HTML,
]);

const startsWith = (buffer: Buffer, signature: string) =>
    buffer.subarray(0, signature.length).toString('latin1') === signature;

// A NUL byte never appears in text (UTF-8 included); it does in binaries.
const looksLikeText = (buffer: Buffer) =>
    !buffer.subarray(0, TEXT_SNIFF_BYTES).includes(0);

const SIGNATURE_CHECKS: Partial<Record<string, (buffer: Buffer) => boolean>> = {
    [ENUM_FILE_MIME_DOCUMENT.PDF]: buffer =>
        buffer.subarray(0, PDF_HEADER_WINDOW).includes('%PDF-'),
    // DOCX is a zip archive.
    [ENUM_FILE_MIME_DOCUMENT.DOCX]: buffer => startsWith(buffer, 'PK\x03\x04'),
    [ENUM_FILE_MIME_DOCUMENT.TXT]: looksLikeText,
    [ENUM_FILE_MIME_DOCUMENT.MD]: looksLikeText,
    [ENUM_FILE_MIME_DOCUMENT.HTML]: looksLikeText,
};

// "text/plain; charset=utf-8" -> "text/plain"
const baseType = (mimetype: string) =>
    mimetype.split(';')[0].trim().toLowerCase();

/**
 * Whether the file's bytes fit its declared document type. Types without a
 * check (anything but the knowledge document types) are let through.
 */
export const matchesDeclaredType = (
    mimetype: string,
    buffer: Buffer
): boolean => SIGNATURE_CHECKS[baseType(mimetype)]?.(buffer) ?? true;

/**
 * A text file saved as UTF-16 (Windows Notepad's "Unicode"), recognised by
 * its byte order mark. The AI service reads text as UTF-8.
 */
export const isUtf16Text = (mimetype: string, buffer: Buffer): boolean =>
    TEXT_TYPES.has(baseType(mimetype)) &&
    (startsWith(buffer, '\xff\xfe') || startsWith(buffer, '\xfe\xff'));
