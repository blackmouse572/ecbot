import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CHAT_UPLOAD_MAX_FILES } from '@app/modules/conversation/constants/message-media.constant';
import { ChatAttachmentRequestDto } from '@app/modules/conversation/dtos/request/chat-attachment.request.dto';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
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
    @IsDefined()
    @IsString()
    @MaxLength(4000)
    // May be empty when the message carries attachments; the service
    // refuses a message with neither.
    text: string;

    @ApiPropertyOptional({
        type: () => ChatAttachmentRequestDto,
        isArray: true,
        description:
            'Files uploaded for this message with the attachments endpoint',
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(CHAT_UPLOAD_MAX_FILES)
    @ValidateNested({ each: true })
    @Type(() => ChatAttachmentRequestDto)
    attachments?: ChatAttachmentRequestDto[];

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
        description:
            'The tracked link code (ecb_src) the visitor arrived with. An unknown or malformed code is ignored.',
        example: 'trang-khuyen-mai',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    source?: string;

    @ApiPropertyOptional({
        description: 'Turnstile token. Required once per visitor session.',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;
}
