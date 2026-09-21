import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_FILE_MIME_DOCUMENT } from 'src/common/file/enums/file.enum';
import { AwsS3PresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-presign.request.dto';

export class RAGUploadFileRequestDto extends PickType(AwsS3PresignRequestDto, [
    'size',
]) {
    @ApiProperty({
        type: 'string',
        enum: ENUM_FILE_MIME_DOCUMENT,
        default: ENUM_FILE_MIME_DOCUMENT.PDF,
        description: 'MIME type of the document file to upload',
    })
    @IsString()
    @IsEnum(ENUM_FILE_MIME_DOCUMENT)
    @IsNotEmpty()
    mime: ENUM_FILE_MIME_DOCUMENT;

    @ApiProperty({
        type: 'string',
        description: 'Original file name',
        example: 'document.pdf',
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}
