import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ApiChannelSendMessageRequestDto {
    @ApiProperty({
        description:
            'Which API channel account in this workspace the message is for',
        example: '2c3f0b6e-3a1d-4a2c-9f9d-2a1e5c7b41aa',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    accountKey: string;

    @ApiProperty({
        description:
            "The third party's own id for the end user. Becomes the conversation's sender.",
        example: 'user-42',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    senderId: string;

    @ApiProperty({
        description: 'The message text',
        example: 'Do you ship to Da Nang?',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(4000)
    text: string;

    @ApiPropertyOptional({
        description:
            'Caller-supplied id used for deduplication. Resending the same id is a no-op. One is generated if omitted.',
        example: 'msg-000123',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    messageId?: string;

    @ApiPropertyOptional({
        description: 'When the end user sent the message (ISO). Defaults to now.',
        example: '2026-09-04T10:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    timestamp?: string;
}
