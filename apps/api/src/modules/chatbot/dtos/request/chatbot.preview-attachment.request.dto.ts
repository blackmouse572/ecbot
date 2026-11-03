import { ChatAttachmentUploadRequestDto } from '@app/modules/conversation/dtos/request/chat-attachment.request.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

/** A share-link upload: the file, the signed token that allows it, and the
 *  chat session it is for, which passes the same Turnstile gate as a turn. */
export class ChatbotPreviewAttachmentRequestDto extends ChatAttachmentUploadRequestDto {
    @ApiProperty({
        description: 'The signed share token from the public preview link',
    })
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    token: string;

    @ApiProperty({
        required: false,
        description: 'The chat session the file will be sent in',
    })
    @IsOptional()
    @Matches(/^[A-Za-z0-9_-]{1,64}$/)
    chat_session_id?: string;

    @ApiProperty({
        required: false,
        description:
            'Cloudflare Turnstile token; needed until the session is verified',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;
}
