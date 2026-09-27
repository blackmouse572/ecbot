import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
    ENUM_MESSAGE_STATUS,
} from '../../enums/message.enum';

export class MessageAuthorDto {
    @ApiProperty({
        description:
            'Author ID (user UUID, chatbot UUID, or platform sender ID)',
    })
    id: string;

    @ApiProperty({ description: 'Display name of the author' })
    name: string;
}

/**
 * One persisted tool invocation joined under a BOT message in the
 * conversation-detail timeline. Shape mirrors the live ToolCallList
 * payload streamed to the preview-chat UI so the same component can render
 * both live and retrospective calls.
 */
export interface ToolCallSerialization {
    invocationId: string;
    toolName: string;
    actionName?: string;
    args: Record<string, unknown>;
    status: 'success' | 'error';
    result?: unknown;
    error?: string;
    durationMs: number;
}

/**
 * Mirrors the entity's `MessageReaction` type
 * (`message.entity.ts`) for serialization.
 */
export class MessageReactionResponseDto {
    @ApiProperty({ description: 'Reaction emoji' })
    emoji: string;

    @ApiProperty({
        description: 'Type of actor who left the reaction',
        enum: ['customer', 'operator', 'bot'],
    })
    actorType: 'customer' | 'operator' | 'bot';

    @ApiPropertyOptional({ description: 'Actor ID (operator user ID, etc.)' })
    actorId?: string;

    @ApiProperty({ description: 'When the reaction was made (ISO timestamp)' })
    at: string;
}

/** A media attachment on a message — a customer's photo or an image the
 *  bot sent. `url` is absent when the platform only gave a file id. */
export class MessageAttachmentResponseDto {
    @ApiProperty({
        description: 'Attachment kind',
        example: 'image',
    })
    type: string;

    @ApiPropertyOptional({ description: 'Media URL, when known' })
    url?: string;
}

export class MessageGetResponseDto {
    @Expose()
    @ApiProperty({ description: 'Message ID' })
    id: string;

    @Expose()
    @ApiProperty({ enum: ENUM_MESSAGE_DIRECTION })
    direction: ENUM_MESSAGE_DIRECTION;

    @Expose()
    @ApiProperty({ enum: ENUM_MESSAGE_AUTHOR })
    authorType: ENUM_MESSAGE_AUTHOR;

    @Expose()
    @ApiProperty({
        description:
            'Sender ID — platform PSID, bot account ID, or operator user ID',
    })
    authorId: string;

    @Expose()
    @ApiProperty({
        description: 'Message text',
        required: false,
        nullable: true,
    })
    text?: string;

    @Expose()
    @ApiProperty({
        description: 'Platform message ID assigned after successful delivery',
        required: false,
        nullable: true,
    })
    externalId?: string;

    @Expose()
    @ApiProperty({
        description: 'Outbound delivery status',
        enum: ENUM_MESSAGE_STATUS,
        required: false,
        nullable: true,
    })
    status?: ENUM_MESSAGE_STATUS;

    @Expose()
    @ApiProperty({ description: 'When the message was sent' })
    dateSent: Date;

    @Expose()
    @ApiProperty({ description: 'Record creation timestamp' })
    createdAt: Date;

    @ApiProperty({
        description: 'Resolved author info — name and ID of the sender',
        type: () => MessageAuthorDto,
        required: false,
    })
    author?: MessageAuthorDto;

    @Expose()
    @ApiPropertyOptional({
        type: 'array',
        description:
            'Tool calls persisted under this assistant message, joined from tool_invocations by conversation_id. Only populated for BOT-authored messages.',
        items: { type: 'object' },
    })
    toolCalls?: ToolCallSerialization[];

    @ApiPropertyOptional({
        type: () => MessageAttachmentResponseDto,
        isArray: true,
        description: 'Images and other media on this message',
    })
    attachments?: MessageAttachmentResponseDto[];

    @Expose()
    @ApiPropertyOptional({
        type: () => MessageReactionResponseDto,
        isArray: true,
        description: 'Reactions left on this message',
    })
    reactions?: MessageReactionResponseDto[];
}
