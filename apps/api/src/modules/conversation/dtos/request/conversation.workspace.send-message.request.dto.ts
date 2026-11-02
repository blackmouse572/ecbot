import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDefined,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { CHAT_UPLOAD_MAX_FILES } from '../../constants/message-media.constant';
import { ChatAttachmentRequestDto } from './chat-attachment.request.dto';

export class ConversationWorkspaceSendMessageRequestDto {
    @IsDefined()
    @IsString()
    @MaxLength(4096)
    @ApiProperty({
        description:
            'Message text to send to the customer. May be empty when the message has attachments.',
        example: 'Hi! How can I help you today?',
        maxLength: 4096,
    })
    text: string;

    @ApiProperty({
        required: false,
        type: [ChatAttachmentRequestDto],
        description:
            'Photos or a file stored with the attachments endpoint: either one file or up to 10 photos. Each goes out as its own message before the text.',
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(CHAT_UPLOAD_MAX_FILES)
    @ValidateNested({ each: true })
    @Type(() => ChatAttachmentRequestDto)
    attachments?: ChatAttachmentRequestDto[];
}
