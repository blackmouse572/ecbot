import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ConversationSendMessageRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(4096)
    @ApiProperty({
        description: 'Message text to send to the customer',
        example: 'Hi! How can I help you today?',
        maxLength: 4096,
    })
    text: string;

    @IsOptional()
    @IsArray()
    @ApiProperty({
        description: 'Optional attachments (platform-specific payload)',
        required: false,
        type: [Object],
    })
    attachments?: unknown[];
}
