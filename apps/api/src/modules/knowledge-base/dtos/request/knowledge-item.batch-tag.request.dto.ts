import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsNotEmpty,
    IsString,
    MaxLength,
} from 'class-validator';
import { BatchIdsRequestDto } from '@app/common/batch/dtos/batch.request.dto';

export const KNOWLEDGE_ITEM_BATCH_TAG_MAX = 20;

export class KnowledgeItemBatchTagRequestDto extends BatchIdsRequestDto {
    @ApiProperty({
        type: [String],
        description: `Tags to add to every item (max ${KNOWLEDGE_ITEM_BATCH_TAG_MAX}). Tags an item already has are kept as they are.`,
        example: ['FAQ', 'menu'],
    })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @ArrayMaxSize(KNOWLEDGE_ITEM_BATCH_TAG_MAX)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    tags: string[];
}
