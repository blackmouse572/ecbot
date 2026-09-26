import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
}
