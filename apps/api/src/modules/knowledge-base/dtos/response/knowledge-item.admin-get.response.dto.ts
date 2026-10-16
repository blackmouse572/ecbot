import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { KnowledgeItemAdminChatbotResponseDto } from './knowledge-item.admin-chatbot.response.dto';
import { KnowledgeItemAdminListResponseDto } from './knowledge-item.admin-list.response.dto';

// Where the item came from is named, never linked: no signed or storage URL.
export class KnowledgeItemAdminGetResponseDto extends KnowledgeItemAdminListResponseDto {
    @ApiPropertyOptional({
        example: 'https://shop.vn/faq',
        description:
            'Page address of a URL item, or the source link of a TEXT item',
    })
    @Expose()
    sourceUrl?: string;

    @ApiPropertyOptional({ example: 'bang-gia.pdf' })
    @Expose()
    fileName?: string;

    @ApiPropertyOptional({ example: 'application/pdf' })
    @Expose()
    mimeType?: string;

    @ApiPropertyOptional({ example: 'File format not supported' })
    @Expose()
    errorMessage?: string;

    @ApiPropertyOptional({ example: new Date('2026-10-02T01:15:36.079Z') })
    @Expose()
    processedAt?: Date;

    @ApiProperty({ type: [KnowledgeItemAdminChatbotResponseDto] })
    @Expose()
    @Type(() => KnowledgeItemAdminChatbotResponseDto)
    chatbots: KnowledgeItemAdminChatbotResponseDto[];
}
