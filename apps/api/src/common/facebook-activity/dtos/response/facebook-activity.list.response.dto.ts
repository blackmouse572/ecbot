import { ENUM_FACEBOOK_MESSAGE_EVENT_TYPE } from '@app/common/enums/facebook.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

export class FacebookActivityListResponseDto extends DatabaseDto {
    @ApiProperty({
        example: '123456789',
        description: 'Page the events belong to',
    })
    pageId: string;

    @ApiProperty({
        example: '987654321',
        description: 'Sender PSID',
    })
    senderId: string;

    @ApiProperty({
        type: 'string',
        enum: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE,
        example: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE,
        description: 'Messaging event kind',
    })
    eventType: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE;

    @ApiPropertyOptional({
        example: '123456789',
        description: 'Recipient id',
    })
    recipientId?: string;

    @ApiPropertyOptional({
        example: 'mid.12345',
        description: 'Message id',
    })
    messageId?: string;

    @ApiPropertyOptional({
        example: 'Hello!',
        description: 'Message body',
    })
    messageText?: string;

    @ApiPropertyOptional({
        type: Object,
        description: 'Event payload',
    })
    eventPayload?: Record<string, any>;

    @ApiPropertyOptional({
        type: Object,
        description: 'Raw webhook body',
    })
    webhookPayload?: Record<string, any>;

    @ApiPropertyOptional({
        type: Object,
        description: 'Extra metadata',
    })
    metadata?: Record<string, any>;

    @ApiPropertyOptional({
        example: true,
        description: 'Whether processing already finished',
    })
    processed?: boolean;

    @ApiPropertyOptional({
        example: 'Unsupported event payload',
        description: 'Why the last processing attempt failed',
    })
    processingError?: string;

    @ApiPropertyOptional({
        example: new Date('2026-09-20T09:15:00.000Z'),
        description: 'When processing finished',
    })
    processedAt?: Date;
}
