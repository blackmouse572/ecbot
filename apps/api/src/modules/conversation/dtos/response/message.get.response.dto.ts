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
 * conversation-detail timeline. Shape mirrors the app's `ChatToolCall`, which
 * the live chat builds from the stream, so `ToolTrace` renders both live and
 * saved calls.
 */
export interface ToolCallSerialization {
    invocationId: string;
    toolName: string;
    actionName?: string;
    args: Record<string, unknown>;
    status: 'success' | 'error';
    result?: unknown;
    error?: string;
    /** Absent for a skill load, which is not timed. */
    durationMs?: number;
    /**
     * Tool kind, lowercased like the live stream's `data-tool-meta`; mirrors
     * the app's `ToolKind`. `handoff` is a tag that handed the chat to staff.
     */
    kind?:
        | 'http'
        | 'mcp'
        | 'skill'
        | 'customer'
        | 'tag'
        | 'followup'
        | 'image'
        | 'handoff';
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
        description:
            'Attachment kind: image, sticker, story, share, audio, video, file or location',
        example: 'image',
    })
    type: string;

    @ApiPropertyOptional({ description: 'Media URL, when known' })
    url?: string;

    @ApiPropertyOptional({
        description: 'Sticker only: the emoji the platform pairs with it',
    })
    emoji?: string;

    @ApiPropertyOptional({
        description: 'File only: the name shown on it',
        example: 'Menu.pdf',
    })
    name?: string;
}

/** What an inbound message answers: a quoted message or the business's
 *  story (whose image is the message's `story` attachment). */
export class MessageReplyToResponseDto {
    @ApiProperty({ enum: ['message', 'story'] })
    kind: 'message' | 'story';

    @ApiPropertyOptional({
        description: 'Our copy of the quoted message, when we have it',
    })
    messageId?: string;

    @ApiPropertyOptional({
        description: 'The quoted message text, cut short',
    })
    text?: string;

    @ApiPropertyOptional({
        description: "The quoted message was the customer's own",
    })
    fromCustomer?: boolean;
}

/** The agent chose not to answer this customer message. */
export class MessageNoReplyResponseDto {
    @ApiPropertyOptional({
        description: 'Why, in a few words the agent wrote for staff',
    })
    reason?: string;
}

/** One knowledge source behind a BOT reply, for the operator trace. */
export class MessageKnowledgeSourceResponseDto {
    @ApiProperty({ description: 'Knowledge item id' })
    id: string;

    @ApiPropertyOptional({ description: 'Knowledge item or page title' })
    title?: string;

    @ApiPropertyOptional({
        description: 'Web page link, when the item has one',
    })
    sourceUrl?: string;
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

    @Expose()
    @ApiPropertyOptional({
        description:
            'Knowledge sources the agent found before this BOT reply. Only on channel replies.',
    })
    knowledgeCount?: number;

    @Expose()
    @ApiPropertyOptional({
        type: () => MessageKnowledgeSourceResponseDto,
        isArray: true,
        description:
            'The knowledge sources behind this BOT reply, when the AI service reported them',
    })
    sources?: MessageKnowledgeSourceResponseDto[];

    @ApiPropertyOptional({
        type: () => MessageAttachmentResponseDto,
        isArray: true,
        description: 'Images and other media on this message',
    })
    attachments?: MessageAttachmentResponseDto[];

    @Expose()
    @ApiPropertyOptional({
        type: () => MessageReplyToResponseDto,
        description: 'What this message answers, when it is a reply',
    })
    replyTo?: MessageReplyToResponseDto;

    @Expose()
    @ApiPropertyOptional({
        type: () => MessageNoReplyResponseDto,
        description:
            'Set on a customer message the agent chose not to answer (e.g. an ok sticker after its answer)',
    })
    noReply?: MessageNoReplyResponseDto;

    @Expose()
    @ApiPropertyOptional({
        type: () => MessageReactionResponseDto,
        isArray: true,
        description: 'Reactions left on this message',
    })
    reactions?: MessageReactionResponseDto[];
}
