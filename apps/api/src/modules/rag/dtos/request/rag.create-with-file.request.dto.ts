import { AwsS3PresignRequestDto } from '@app/modules/aws/dtos/request/aws.s3-presign.request.dto';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class RAGCreateWithFileRequestDto {
    @ApiProperty({
        description: 'The ID of the chatbot this RAG file belongs to',
        type: String,
        required: true,
        example: '507f1f77bcf86cd799439011',
    })
    @IsString()
    @IsNotEmpty()
    chatbot: string;

    @ApiProperty({
        description: 'The ID of the attachment/file in AWS S3',
        type: AwsS3PresignRequestDto,
        oneOf: [{ $ref: getSchemaPath(AwsS3PresignRequestDto) }],
        required: true,
        example: '507f1f77bcf86cd799439011',
    })
    @IsNotEmpty()
    @Type(() => AwsS3PresignRequestDto)
    attachment: AwsS3PresignRequestDto;
}
