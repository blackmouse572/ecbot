import { ChatAttachmentUploadRequestDto } from '@app/modules/conversation/dtos/request/chat-attachment.request.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** A visitor's upload: the file, and the same gate fields a message carries. */
export class WidgetAttachmentRequestDto extends ChatAttachmentUploadRequestDto {
    @ApiProperty({ example: 'v_9f2c1a7e4b' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    visitorId: string;

    @ApiPropertyOptional({ example: 'https://shop.example.com/checkout' })
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
