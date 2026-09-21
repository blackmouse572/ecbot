import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { FollowupEntity } from '../../repository/entities/followup.entity';
import { ENUM_FOLLOWUP_STATUS } from '../../constants/followup.constant';

/** Minutes until a scheduled followup fires; 0 once it is no longer pending. */
export function followupFiresInMinutes(followup: FollowupEntity): number {
    if (followup.status !== ENUM_FOLLOWUP_STATUS.SCHEDULED) return 0;

    return Math.max(
        0,
        Math.round((followup.scheduledAt.getTime() - Date.now()) / 60_000)
    );
}

export class FollowupChatbotResponseDto {
    @ApiProperty({ description: 'Chatbot ID' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'Chatbot name' })
    @Expose()
    name: string;

    @ApiProperty({ description: 'Chatbot avatar URL', nullable: true })
    @Expose()
    @Transform(({ obj }) => obj.avatar ?? null)
    avatar: string | null;
}

export class FollowupListResponseDto {
    @ApiProperty({ description: 'Follow-up job ID' })
    @Expose()
    @Transform(({ obj }) => obj.id)
    followupId: string;

    @ApiProperty({ type: FollowupChatbotResponseDto })
    @Expose()
    @Type(() => FollowupChatbotResponseDto)
    chatbot: FollowupChatbotResponseDto;

    @ApiProperty({ description: 'Conversation the follow-up belongs to' })
    @Expose()
    @Transform(({ obj }) => obj.conversation?.id ?? null)
    conversationId: string;

    @ApiProperty({
        description: 'Sender name on the conversation',
        nullable: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.conversation?.senderName ?? null)
    senderName: string | null;

    @ApiProperty({
        description: 'Message that triggered scheduling this follow-up',
        nullable: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.triggerMessageId ?? null)
    triggerMessageId: string | null;

    @ApiProperty({ description: 'Reason the follow-up was scheduled' })
    @Expose()
    reason: string;

    @ApiProperty({ enum: ENUM_FOLLOWUP_STATUS })
    @Expose()
    status: ENUM_FOLLOWUP_STATUS;

    @ApiProperty({
        description: 'When the follow-up is due to fire',
        type: String,
        format: 'date-time',
    })
    @Expose()
    scheduledAt: Date;

    @ApiProperty({
        description: 'When the follow-up actually ran',
        type: String,
        format: 'date-time',
        nullable: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.firedAt ?? null)
    firedAt: Date | null;

    @ApiProperty({
        description: 'Skip reason, or the error message when the run failed',
        type: String,
        nullable: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.outcomeReason ?? null)
    outcomeReason: string | null;

    @ApiProperty({
        description:
            'Minutes remaining until the follow-up fires; 0 once it is no longer scheduled',
    })
    @Expose()
    @Transform(({ obj }) => followupFiresInMinutes(obj))
    firesInMinutes: number;
}
