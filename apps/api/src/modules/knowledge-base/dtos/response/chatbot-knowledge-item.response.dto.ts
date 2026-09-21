import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { KnowledgeItemResponseDto } from './knowledge-item.response.dto';

export class ChatbotKnowledgeItemResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Chatbot ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @Expose()
    @Transform(({ obj }) => obj.chatbot?.id || obj.chatbotId)
    chatbotId: string;

    @ApiProperty({
        description: 'Knowledge item ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @Expose()
    @Transform(({ obj }) => obj.knowledgeItem?.id || obj.knowledgeItemId)
    knowledgeItemId: string;

    @ApiProperty({
        description: 'Linked knowledge item details',
        type: KnowledgeItemResponseDto,
    })
    @Expose()
    @Type(() => KnowledgeItemResponseDto)
    knowledgeItem: KnowledgeItemResponseDto;

    @ApiProperty({
        description: 'Priority order for document ranking in RAG',
        example: 10,
    })
    @Expose()
    priority: number;

    @ApiProperty({
        description: 'Is the link active',
        example: true,
    })
    @Expose()
    isActive: boolean;
}
