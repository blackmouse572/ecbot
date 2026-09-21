import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Everything an anonymous visitor is allowed to learn about a chatbot.
 *
 * An explicit allowlist, never a spread of the entity: ChatbotEntity carries
 * the system prompt, model id, provider and guardrail instructions, none of
 * which may leak through a public link.
 */
export class ChatbotPreviewMetaResponseDto {
    @ApiProperty({ example: 'Ecbot Assistant' })
    name: string;

    @ApiPropertyOptional()
    avatar?: string;

    @ApiPropertyOptional({ example: 'Xin chào! Mình có thể giúp gì cho bạn?' })
    welcomeMessage?: string;

    @ApiPropertyOptional({ example: 'vi' })
    primaryLanguage?: string;

    @ApiProperty({
        description:
            'When this share link stops working. Surfaced so the standalone page can show the time left instead of decoding the token client-side.',
    })
    expiresAt: Date;
}
