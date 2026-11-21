import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/enums/file.enum';

export class ProductGroupUploadImageRequestDto {
    @ApiProperty({
        enum: ENUM_FILE_MIME_IMAGE,
        example: ENUM_FILE_MIME_IMAGE.JPG,
    })
    @IsEnum(ENUM_FILE_MIME_IMAGE)
    @IsNotEmpty()
    mime: ENUM_FILE_MIME_IMAGE;

    // 5MB, like profile photos.
    @ApiProperty({ example: 1024, description: 'Unit in bytes, max 5MB' })
    @Min(1)
    @Max(5 * 1024 * 1024)
    @IsInt()
    size: number;
}
