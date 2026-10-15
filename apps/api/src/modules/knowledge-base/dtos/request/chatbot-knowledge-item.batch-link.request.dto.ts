import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsOptional,
    IsUUID,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { BATCH_MAX_IDS } from '@app/common/batch/dtos/batch.request.dto';
import { KnowledgeItemFilterRequestDto } from './knowledge-item.filter.request.dto';

/**
 * Which items to link: the listed `ids`, or every item matching `filter` in
 * `knowledgeBaseId` (resolved by the API, so one request covers any selection).
 */
export class ChatbotKnowledgeItemBatchLinkRequestDto {
    @ApiPropertyOptional({
        type: [String],
        description: `Ids to link (max ${BATCH_MAX_IDS}). Send this or \`filter\`.`,
    })
    @ValidateIf(o => o.filter === undefined || o.ids !== undefined)
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @ArrayMaxSize(BATCH_MAX_IDS)
    @IsUUID('4', { each: true })
    ids?: string[];

    @ApiPropertyOptional({
        type: KnowledgeItemFilterRequestDto,
        description:
            'Link every item matching these filters instead of listing ids. An empty filter matches the whole knowledge base.',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => KnowledgeItemFilterRequestDto)
    filter?: KnowledgeItemFilterRequestDto;

    @ApiPropertyOptional({
        description:
            'Knowledge base the `filter` applies to. Required with `filter`.',
    })
    @ValidateIf(o => o.filter !== undefined)
    @IsUUID('4')
    knowledgeBaseId?: string;
}
