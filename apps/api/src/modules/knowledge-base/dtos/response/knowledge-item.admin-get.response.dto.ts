import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { KnowledgeItemAdminChatbotResponseDto } from './knowledge-item.admin-chatbot.response.dto';
import { KnowledgeItemAdminListResponseDto } from './knowledge-item.admin-list.response.dto';

// What the owner's item page shows, read-only: the written text of a TEXT
// item, a media description, what was read from a web page and a preview link
// for files and media. No bucket or key fields.
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

    @ApiPropertyOptional({
        example: 'Mở cửa từ 7h đến 22h mỗi ngày.',
        description: 'Body of a TEXT item, or the description of a MEDIA item',
    })
    @Expose()
    content?: string;

    @ApiPropertyOptional({
        example: 'FAQ | Shop',
        description: 'Title of the start page of a URL item',
    })
    @Expose()
    pageTitle?: string;

    @ApiPropertyOptional({
        example: 'Giao hàng trong 2 ngày...',
        description: 'Start of the text read from a URL item',
    })
    @Expose()
    preview?: string;

    @ApiPropertyOptional({
        example: 4,
        description: 'Pages read for a URL item',
    })
    @Expose()
    pagesCrawled?: number;

    @ApiPropertyOptional({
        example: 'https://cdn.ecbot.dev/knowledge-items/menu.pdf',
        description:
            'Short-lived link to view or download a FILE, or the public link of a MEDIA item',
    })
    @Expose()
    previewUrl?: string;

    @ApiProperty({ type: [String], example: ['menu', 'faq'] })
    @Expose()
    tags: string[];

    @ApiProperty({ type: [KnowledgeItemAdminChatbotResponseDto] })
    @Expose()
    @Type(() => KnowledgeItemAdminChatbotResponseDto)
    chatbots: KnowledgeItemAdminChatbotResponseDto[];
}
