import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';

// Most items one filtered batch request acts on; more matches are cut off.
export const KNOWLEDGE_ITEM_BATCH_FILTER_MAX = 2000;

/** The same filters as the knowledge item list, as a request body. */
export class KnowledgeItemFilterRequestDto {
    @ApiPropertyOptional({ description: 'Text the title contains.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    search?: string;

    @ApiPropertyOptional({
        enum: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    @IsEnum(ENUM_KNOWLEDGE_BASE_ITEM_TYPE, { each: true })
    type?: ENUM_KNOWLEDGE_BASE_ITEM_TYPE[];

    @ApiPropertyOptional({
        enum: ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    @IsEnum(ENUM_KNOWLEDGE_BASE_ITEM_STATUS, { each: true })
    status?: ENUM_KNOWLEDGE_BASE_ITEM_STATUS[];

    @ApiPropertyOptional({
        type: [String],
        description: 'Items that have any of these tags.',
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(50)
    @IsString({ each: true })
    tags?: string[];
}
