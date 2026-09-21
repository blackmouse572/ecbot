import { AccountGetResponseDto } from '@app/modules/account/dtos/response/account.get.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ENUM_CONVERSATION_STATUS } from '../../enums/conversation.enum';
import { ChatbotGetDetailShortResponseDto } from '@app/modules/chatbot/dtos/response/chatbot.detail.response.dto';

export class ConversationGetResponseDto {
    @Expose()
    @ApiProperty({ description: 'Conversation ID' })
    id: string;

    @Expose()
    @ApiProperty({
        description: 'Conversation lifecycle status',
        enum: ENUM_CONVERSATION_STATUS,
        example: ENUM_CONVERSATION_STATUS.OPEN,
    })
    status: ENUM_CONVERSATION_STATUS;

    @Expose()
    @ApiProperty({
        description:
            'Whether the bot replies automatically (vs. operator handling)',
        example: true,
    })
    botEnabled: boolean;

    @Expose()
    @ApiProperty({ description: 'External sender ID (e.g. Facebook PSID)' })
    senderId: string;

    @Expose()
    @ApiProperty({ description: 'Number of consecutive fallback responses' })
    fallbackCount: number;

    @Expose()
    @ApiProperty({
        description: 'Timestamp when handoff was triggered',
        required: false,
        nullable: true,
    })
    handoffAt?: Date;

    @Expose()
    @ApiProperty({
        description: 'Timestamp when conversation was resolved',
        required: false,
        nullable: true,
    })
    resolvedAt?: Date;

    @Expose()
    @ApiProperty({
        description: 'Timestamp of last message in conversation',
        required: false,
        nullable: true,
    })
    lastMessageAt?: Date;

    @Expose()
    @ApiProperty({
        description: 'Reason for handoff',
        required: false,
        nullable: true,
    })
    handoffReason?: string;

    @Expose()
    @ApiProperty({ required: false })
    senderName?: string;

    @Expose()
    @ApiProperty({ required: false })
    senderAvatar?: string;

    @Expose()
    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: Date;

    @Expose()
    @ApiProperty({ description: 'Last update timestamp', required: false })
    updatedAt?: Date;

    @Expose()
    @Type(() => ChatbotGetDetailShortResponseDto)
    @ApiProperty({ description: 'Chatbot reference', required: false })
    chatbot?: ChatbotGetDetailShortResponseDto;

    @Expose()
    @Type(() => AccountGetResponseDto)
    @ApiProperty({ type: () => AccountGetResponseDto, required: false })
    account?: AccountGetResponseDto;

    @Expose()
    @ApiProperty({
        description:
            'Number of unread USER messages for the requesting operator. Present on list responses only.',
        required: false,
    })
    unreadCount?: number;

    @Expose()
    @ApiProperty({
        description: 'ID of the linked Customer (via ContactPoint)',
        required: false,
        nullable: true,
    })
    customerId?: string;

    @Expose()
    @ApiProperty({
        description:
            "Whether the account's platform adapter supports sending reactions to messages. False if the platform can't be resolved.",
        default: false,
    })
    canReact: boolean = false;
}
