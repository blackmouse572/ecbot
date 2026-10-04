import {
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ENUM_FILE_MIME_DOCUMENT } from '@app/common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@app/common/file/enums/file.status-code.enum';
import { FileContentPipe } from '@app/common/file/pipes/file.content.pipe';

// #168: a 0-byte .txt and an executable renamed .pdf were accepted (201) and
// only failed at ingest. The bytes are checked at upload instead.
describe('FileContentPipe', () => {
    const pipe = new FileContentPipe();
    const file = (mimetype: string, buffer: Buffer) =>
        ({ mimetype, buffer, size: buffer.length }) as any;

    it('passes when no file was sent', async () => {
        await expect(pipe.transform(undefined)).resolves.toBeUndefined();
    });

    it('rejects an empty file', async () => {
        const result = pipe.transform(
            file(ENUM_FILE_MIME_DOCUMENT.TXT, Buffer.alloc(0))
        );

        await expect(result).rejects.toBeInstanceOf(
            UnprocessableEntityException
        );
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.EMPTY,
                message: 'file.error.empty',
            },
        });
    });

    it('rejects a "PDF" that is not a PDF', async () => {
        const result = pipe.transform(
            file(ENUM_FILE_MIME_DOCUMENT.PDF, Buffer.from('MZ\x90\x00binary'))
        );

        await expect(result).rejects.toBeInstanceOf(
            UnsupportedMediaTypeException
        );
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.CONTENT_MISMATCH,
                message: 'file.error.contentMismatch',
            },
        });
    });

    it('rejects a "DOCX" that is not a zip', async () => {
        await expect(
            pipe.transform(
                file(ENUM_FILE_MIME_DOCUMENT.DOCX, Buffer.from('%PDF-1.7'))
            )
        ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });

    it('rejects binary data sent as text', async () => {
        await expect(
            pipe.transform(
                file(ENUM_FILE_MIME_DOCUMENT.TXT, Buffer.from('MZ\x00\x00'))
            )
        ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });

    it.each([
        [ENUM_FILE_MIME_DOCUMENT.PDF, Buffer.from('%PDF-1.7\n...')],
        [ENUM_FILE_MIME_DOCUMENT.DOCX, Buffer.from('PK\x03\x04rest')],
        [ENUM_FILE_MIME_DOCUMENT.TXT, Buffer.from('Giờ mở cửa: 8h')],
        [ENUM_FILE_MIME_DOCUMENT.MD, Buffer.from('# Menu')],
        [ENUM_FILE_MIME_DOCUMENT.HTML, Buffer.from('<p>hi</p>')],
    ])('accepts real %s content', async (mimetype, buffer) => {
        const real = file(mimetype, buffer);

        await expect(pipe.transform(real)).resolves.toBe(real);
    });

    // PDF readers accept the header anywhere in the first 1024 bytes.
    it('accepts a PDF whose header follows a few leading bytes', async () => {
        const pdf = file(
            ENUM_FILE_MIME_DOCUMENT.PDF,
            Buffer.from('\r\n%PDF-1.7\n...')
        );

        await expect(pipe.transform(pdf)).resolves.toBe(pdf);
    });

    // Windows Notepad's "Unicode" is UTF-16; the AI side reads text as UTF-8.
    it('asks for UTF-8 when a text file is UTF-16', async () => {
        const utf16 = Buffer.concat([
            Buffer.from([0xff, 0xfe]),
            Buffer.from('Menu', 'utf16le'),
        ]);
        const result = pipe.transform(file(ENUM_FILE_MIME_DOCUMENT.TXT, utf16));

        await expect(result).rejects.toBeInstanceOf(
            UnsupportedMediaTypeException
        );
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.TEXT_NOT_UTF8,
                message: 'file.error.textNotUtf8',
            },
        });
    });

    it('checks a text type that carries a charset parameter', async () => {
        await expect(
            pipe.transform(
                file('text/plain; charset=utf-8', Buffer.from('MZ\x00\x00'))
            )
        ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });
});
