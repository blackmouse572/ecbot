import { OmitType } from '@nestjs/swagger';
import { KnowledgeItemResponseDto } from './knowledge-item.response.dto';

export class KnowledgeItemShortResponseDto extends OmitType(
    KnowledgeItemResponseDto,
    ['attachment', 'content', 'metadata']
) {}
