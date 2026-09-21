import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsObject,
    IsArray,
    IsEnum,
} from 'class-validator';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';
import { Transform } from 'class-transformer';

export class KnowledgeItemCreateRequestDto {
    @ApiProperty({
        description: 'Item type',
        enum: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        example: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_KNOWLEDGE_BASE_ITEM_TYPE)
    type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE;

    @ApiProperty({
        description: 'Item title',
        example:
            'Accendo quasi arcus comitatus admitto summisse sit cui assumenda paens.',
    })
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiPropertyOptional({
        description: 'Item content (for TEXT/URL types)',
        example:
            'Cohaero quaerat arx umbra earum. Compello xiphias defessus deleniti sponte. Doloribus defetiscor esse curatio.',
    })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({
        description: 'Folder ID to organize item',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @IsOptional()
    @IsString()
    folderId?: string;

    @ApiPropertyOptional({
        description: 'Tags for categorization',
        example: ['Poetry', 'Fiction', 'Biography'],
    })
    @IsOptional()
    // Can be json string or array of strings, so we transform it to array if it's a string
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return [value];
            }
        }
        return value;
    })
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'Type-specific metadata',
        example: { url: 'https://example.com', mimeType: 'application/pdf' },
    })
    @IsOptional()
    // multipart/form-data delivers objects as JSON strings; parse before validating
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    })
    @IsObject()
    metadata?: Record<string, any>;
}
