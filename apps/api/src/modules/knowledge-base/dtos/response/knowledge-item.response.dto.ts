import {
    ApiProperty,
    ApiPropertyOptional,
    getSchemaPath,
} from '@nestjs/swagger';
import { Expose, plainToClass, Transform, Type } from 'class-transformer';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../../enums/knowledge-base-item-status.enum';
import { AwsS3ResponseDto } from '../../../aws/dtos/response/aws.s3-response.dto';

export class KnowledgeItemResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Knowledge base ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @Transform(({ obj }) => obj.knowledgeBase?.id || obj.knowledgeBaseId)
    @Expose()
    knowledgeBaseId: string;

    @ApiProperty({
        description: 'Item type (FILE, URL, TEXT)',
        enum: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        example: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
    })
    @Expose()
    type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE;

    @ApiProperty({
        description: 'Item title',
        example: 'How to reset password',
    })
    @Expose()
    title: string;

    @ApiPropertyOptional({
        description: 'Item content',
        example: 'To reset your password...',
    })
    @Expose()
    content?: string;

    @ApiPropertyOptional({
        description: 'Folder ID',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @Expose()
    @Transform(({ obj }) => obj.folder?.id || obj.folderId)
    folderId?: string;

    @ApiProperty({
        description: 'Processing status',
        enum: ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
        example: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.DRAFT,
    })
    @Expose()
    status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS;

    @ApiPropertyOptional({
        description: 'Error message if processing failed',
        example: 'File format not supported',
    })
    @Expose()
    errorMessage?: string;

    @ApiPropertyOptional({
        description: 'When item was processed',
        example: '2025-02-27T09:15:00Z',
    })
    @Expose()
    @Type(() => Date)
    processedAt?: Date;

    @ApiPropertyOptional({
        description: 'Tags',
        example: ['FAQ', 'password', 'account'],
    })
    @Expose()
    tags?: string[];

    @ApiPropertyOptional({
        description:
            'Source attachment if item is created from an uploaded file',
        type: AwsS3ResponseDto,
        oneOf: [{ $ref: getSchemaPath(AwsS3ResponseDto) }],
    })
    @Type(() => AwsS3ResponseDto)
    @Transform(({ obj }) => {
        return plainToClass(AwsS3ResponseDto, obj.attachment);
    })
    @Expose()
    attachment?: AwsS3ResponseDto;

    @ApiPropertyOptional({
        description: 'Type-specific metadata',
        example: { mimeType: 'application/pdf' },
    })
    @Expose()
    metadata?: Record<string, any>;
}
