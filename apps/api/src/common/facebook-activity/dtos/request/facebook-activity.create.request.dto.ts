import { ENUM_FACEBOOK_MESSAGE_EVENT_TYPE } from '@app/common/enums/facebook.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class FacebookActivityCreateRequestDto {
    @ApiProperty({
        example: '123456789',
        description: 'Page the events belong to',
    })
    @IsString()
    pageId: string;

    @ApiProperty({
        example: '987654321',
        description: 'Sender PSID',
    })
    @IsString()
    senderId: string;

    @ApiProperty({
        enum: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE,
        example: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE,
        description: 'Messaging event kind',
    })
    @IsEnum(ENUM_FACEBOOK_MESSAGE_EVENT_TYPE)
    eventType: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE;

    @ApiPropertyOptional({
        example: '123456789',
        description: 'Recipient id',
    })
    @IsOptional()
    @IsString()
    recipientId?: string;

    @ApiPropertyOptional({
        example: 'mid.12345',
        description: 'Message id',
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiPropertyOptional({
        example: 'Hello!',
        description: 'Message body',
    })
    @IsOptional()
    @IsString()
    messageText?: string;

    @ApiPropertyOptional({
        type: Object,
        description: 'Event payload',
    })
    @IsOptional()
    @IsObject()
    eventPayload?: Record<string, any>;

    @ApiPropertyOptional({
        type: Object,
        description: 'Raw webhook body',
    })
    @IsOptional()
    @IsObject()
    webhookPayload?: Record<string, any>;

    @ApiPropertyOptional({
        type: Object,
        description: 'Extra metadata',
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
