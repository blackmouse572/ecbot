import { validate } from 'class-validator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/enums/file.enum';
import { UserUploadPhotoRequestDto } from 'src/modules/user/dtos/request/user.upload-photo.request.dto';

// Task 14: the presign request used to accept any size, letting a caller
// reserve an S3 PutObject for an arbitrarily large avatar. `size` must now be
// capped at 2MB, same as the direct multipart upload path.
describe('UserUploadPhotoRequestDto - size cap (Task 14)', () => {
    const build = (size: number): UserUploadPhotoRequestDto => {
        const dto = new UserUploadPhotoRequestDto();
        dto.mime = ENUM_FILE_MIME_IMAGE.PNG;
        dto.size = size;
        return dto;
    };

    it('rejects a size above 2MB', async () => {
        const errors = await validate(build(2 * 1024 * 1024 + 1));
        const sizeError = errors.find(e => e.property === 'size');

        expect(sizeError).toBeDefined();
        expect(sizeError?.constraints).toHaveProperty('max');
    });

    it('accepts exactly 2MB', async () => {
        const errors = await validate(build(2 * 1024 * 1024));
        const sizeError = errors.find(e => e.property === 'size');

        expect(sizeError).toBeUndefined();
    });

    it('still rejects 0 (@Min(1) is preserved)', async () => {
        const errors = await validate(build(0));
        const sizeError = errors.find(e => e.property === 'size');

        expect(sizeError).toBeDefined();
        expect(sizeError?.constraints).toHaveProperty('min');
    });
});
