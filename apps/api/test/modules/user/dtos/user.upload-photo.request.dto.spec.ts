import { validate } from 'class-validator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/enums/file.enum';
import { UserUploadPhotoRequestDto } from 'src/modules/user/dtos/request/user.upload-photo.request.dto';

// Task 14: the presign request used to accept any size, letting a caller
// reserve an S3 PutObject for an arbitrarily large avatar. `size` must now be
// capped, same as the direct multipart upload path.
//
// Fix round 1: the controller ruling raised the cap from 2MB to 5MB (and
// added WEBP to the mime allow-list) to match what apps/app already sends,
// instead of breaking real uploads.
describe('UserUploadPhotoRequestDto - size cap (Task 14, Fix round 1: 5MB)', () => {
    const build = (size: number): UserUploadPhotoRequestDto => {
        const dto = new UserUploadPhotoRequestDto();
        dto.mime = ENUM_FILE_MIME_IMAGE.PNG;
        dto.size = size;
        return dto;
    };

    it('rejects a size above 5MB', async () => {
        const errors = await validate(build(5 * 1024 * 1024 + 1));
        const sizeError = errors.find(e => e.property === 'size');

        expect(sizeError).toBeDefined();
        expect(sizeError?.constraints).toHaveProperty('max');
    });

    it('accepts exactly 5MB', async () => {
        const errors = await validate(build(5 * 1024 * 1024));
        const sizeError = errors.find(e => e.property === 'size');

        expect(sizeError).toBeUndefined();
    });

    it('still rejects 0 (@Min(1) is preserved)', async () => {
        const errors = await validate(build(0));
        const sizeError = errors.find(e => e.property === 'size');

        expect(sizeError).toBeDefined();
        expect(sizeError?.constraints).toHaveProperty('min');
    });

    it('accepts mime: WEBP', async () => {
        const dto = build(1024);
        dto.mime = ENUM_FILE_MIME_IMAGE.WEBP;

        const errors = await validate(dto);
        const mimeError = errors.find(e => e.property === 'mime');

        expect(mimeError).toBeUndefined();
    });
});
