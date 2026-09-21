import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
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
    delayMinutes: number;
}
