import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class WidgetSendMessageRequestDto {
    @ApiProperty({
        description:
            'Anonymous visitor id the widget persists in localStorage. Becomes the conversation sender.',
        example: 'v_9f2c1a7e4b',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    visitorId: string;

    @ApiProperty({
        description: 'Deduplication id minted by the widget for this message',
        example: 'wm_01J9X',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    messageId: string;

    @ApiProperty({
        description: 'The visitor message',
        example: 'Do you ship to Da Nang?',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(4000)
    text: string;

    @ApiPropertyOptional({
        description:
            'The page embedding the widget, read from document.referrer. Advisory — checked against the allowlist but not verifiable server-side.',
        example: 'https://shop.example.com/checkout',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    parentOrigin?: string;

    @ApiPropertyOptional({
        description: 'Turnstile token. Required once per visitor session.',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;
}
