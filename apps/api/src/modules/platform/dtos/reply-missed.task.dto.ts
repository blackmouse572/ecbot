import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsUUID } from 'class-validator';
import { ENUM_REPLY_MISSED_PROCESS } from '../constants/reply-missed.constant';

export class ReplyMissedTaskDto {
    @ApiProperty({ enum: ENUM_REPLY_MISSED_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_REPLY_MISSED_PROCESS)
    jobName: ENUM_REPLY_MISSED_PROCESS;

    /** The saved inbound `messages` row the check is about. */
    @ApiProperty({ required: true })
    @IsDefined()
    @IsUUID()
    messageId: string;
}
