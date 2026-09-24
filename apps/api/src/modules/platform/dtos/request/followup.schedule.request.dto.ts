import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

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

    @IsInt()
    @Min(1)
    @Max(43200) // 30 days — a bot has no business scheduling further out than that.
    delayMinutes: number;
}
