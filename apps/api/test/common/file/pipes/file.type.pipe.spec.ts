import { UnsupportedMediaTypeException } from '@nestjs/common';
import { ENUM_FILE_MIME_IMAGE } from '@app/common/file/enums/file.enum';
import { FileTypePipe } from '@app/common/file/pipes/file.type.pipe';

// Task 14: confirms FileTypePipe (the pattern reused for avatar uploads) only
// checks the client-declared `mimetype` multer parses from the multipart
// Content-Type header — it never inspects the actual file bytes. A caller
// can still relabel a GIF/SVG/etc. as "image/png" and pass validation; real
// magic-byte sniffing is not implemented here and is out of scope for this
// task (see report).
describe('FileTypePipe — mimetype trust boundary (Task 14 note)', () => {
    const pipe = new FileTypePipe([
        ENUM_FILE_MIME_IMAGE.JPG,
        ENUM_FILE_MIME_IMAGE.JPEG,
        ENUM_FILE_MIME_IMAGE.PNG,
    ]);

    it('accepts a file whose declared mimetype is in the allow-list', async () => {
        const file = {
            mimetype: 'image/png',
            buffer: Buffer.from('not actually a png'),
        } as any;

        await expect(pipe.transform(file)).resolves.toBe(file);
    });

    it('rejects a declared mimetype outside the allow-list (e.g. gif)', async () => {
        const file = { mimetype: 'image/gif', buffer: Buffer.alloc(0) } as any;

        await expect(pipe.transform(file)).rejects.toBeInstanceOf(
            UnsupportedMediaTypeException
        );
    });

    it('trusts the declared mimetype without inspecting file bytes', async () => {
        // GIF magic bytes ("GIF89a...") relabeled with an allow-listed
        // mimetype: the pipe never looks at `buffer`, so this passes.
        const gifBytesLabeledPng = {
            mimetype: 'image/png',
            buffer: Buffer.from('GIF89a'),
        } as any;

        await expect(
            pipe.transform(gifBytesLabeledPng)
        ).resolves.toBe(gifBytesLabeledPng);
    });
});

// Fix round 1: the controller ruling aligned the backend avatar allow-list to
// what apps/app already sends (JPG, JPEG, PNG, WEBP). This pins the pipe,
// configured with the exact list now used by updateProfile / createWorkSpace
// / updateWorkSpace, to prove a WebP upload is accepted.
describe('FileTypePipe — avatar allow-list includes WEBP (Task 14, Fix round 1)', () => {
    const avatarPipe = new FileTypePipe([
        ENUM_FILE_MIME_IMAGE.JPG,
        ENUM_FILE_MIME_IMAGE.JPEG,
        ENUM_FILE_MIME_IMAGE.PNG,
        ENUM_FILE_MIME_IMAGE.WEBP,
    ]);

    it('accepts a WebP avatar upload', async () => {
        const file = { mimetype: 'image/webp', buffer: Buffer.alloc(0) } as any;

        await expect(avatarPipe.transform(file)).resolves.toBe(file);
    });

    it('still rejects a mimetype outside the (now 4-item) allow-list', async () => {
        const file = { mimetype: 'image/gif', buffer: Buffer.alloc(0) } as any;

        await expect(avatarPipe.transform(file)).rejects.toBeInstanceOf(
            UnsupportedMediaTypeException
        );
    });
});
