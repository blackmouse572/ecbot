import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsObject,
    IsArray,
    IsEnum,
} from 'class-validator';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../../enums/knowledge-base-item-status.enum';

export class KnowledgeItemUpdateRequestDto {
    @ApiPropertyOptional({
        description: 'Item title',
        example: 'Updated title',
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Item content',
        example: 'Updated content',
    })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({
        description: 'Item status',
        enum: ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
    })
    @IsOptional()
    @IsEnum(ENUM_KNOWLEDGE_BASE_ITEM_STATUS)
    status?: ENUM_KNOWLEDGE_BASE_ITEM_STATUS;

    @ApiPropertyOptional({
        description: 'Tags for categorization',
        example: ['FAQ', 'new-tag'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'Type-specific metadata',
        example: { crawlDepth: 2 },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
