import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/enums/file.enum';

export class UserUploadPhotoRequestDto {
    @ApiProperty({
        type: 'string',
        enum: ENUM_FILE_MIME_IMAGE,
        default: ENUM_FILE_MIME_IMAGE.JPG,
    })
    @IsString()
    @IsEnum(ENUM_FILE_MIME_IMAGE)
    @IsNotEmpty()
    mime: ENUM_FILE_MIME_IMAGE;

    // Avatars are capped at 2MB, same as the direct multipart upload path
    // (FileInterceptor limits on updateProfile / workspace avatar uploads).
    // Declared in full (not picked from AwsS3PresignRequestDto) because
    // redeclaring an inherited property in a subclass drops the parent's
    // decorators for that property in class-validator.
    @ApiProperty({
        required: true,
        example: 1024,
        description: 'Unit in bytes, max 2MB',
    })
    @Min(1)
    @Max(2 * 1024 * 1024)
    @IsInt()
    @IsNotEmpty()
    size: number;
}
