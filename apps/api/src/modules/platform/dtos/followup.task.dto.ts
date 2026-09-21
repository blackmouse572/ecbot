import { ApiProperty } from '@nestjs/swagger';
import {
    IsDefined,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';
import { ENUM_FOLLOWUP_PROCESS } from '../constants/followup.constant';

export class FollowupTaskDto {
    @ApiProperty({ enum: ENUM_FOLLOWUP_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_FOLLOWUP_PROCESS)
    jobName: ENUM_FOLLOWUP_PROCESS;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    chatbotId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    providerId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    customerId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    contactPointId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    triggerMessageId?: string;

    /** Optional: tasks enqueued before followup logging shipped have no row. */
    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    followupId?: string;
}
