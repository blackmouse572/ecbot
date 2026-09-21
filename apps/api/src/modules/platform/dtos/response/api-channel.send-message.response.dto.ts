import { ApiProperty } from '@nestjs/swagger';

/**
 * The bot's reply is not in this response — generation is asynchronous. It
 * arrives at the account's callback URL, signed with the account's signing
 * secret.
 */
export class ApiChannelSendMessageResponseDto {
    @ApiProperty({
        description: 'Whether the message was durably accepted for processing',
        example: true,
        required: true,
    })
    accepted: boolean;

    @ApiProperty({
        description:
            'Deduplication id for this message — resending it is a no-op. Echoed back when the caller supplied one.',
        example: 'msg-000123',
        required: true,
    })
    messageId: string;
}
