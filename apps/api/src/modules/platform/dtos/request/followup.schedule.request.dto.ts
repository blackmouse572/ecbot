import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    Min,
    ValidateIf,
} from 'class-validator';
import { FOLLOWUP_MAX_AHEAD_MINUTES } from '../../constants/followup.constant';

export class FollowupScheduleRequestDto {
    @IsUUID()
    conversationId: string;

    @IsUUID()
    chatbotId: string;

    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsUUID()
    providerId: string;

    @IsOptional()
    @IsUUID()
    customerId?: string;

    @IsOptional()
    @IsUUID()
    contactPointId?: string;

    @IsString()
    @IsNotEmpty()
    prompt: string;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsOptional()
    @IsUUID()
    triggerMessageId?: string;

    // Exactly one of `delayMinutes` / `at`; the controller rejects both.
    @ValidateIf((dto: FollowupScheduleRequestDto) => dto.at == null)
    @IsInt()
    @Min(1)
    @Max(FOLLOWUP_MAX_AHEAD_MINUTES)
    delayMinutes?: number;

    /** Local wall-clock time in the conversation's timezone, no offset. */
    @ValidateIf((dto: FollowupScheduleRequestDto) => dto.delayMinutes == null)
    @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    at?: string;
}
