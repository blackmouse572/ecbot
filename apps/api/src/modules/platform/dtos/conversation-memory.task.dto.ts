import { ApiProperty } from '@nestjs/swagger';
import {
    IsDefined,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';
import { ENUM_CONVERSATION_MEMORY_PROCESS } from '../constants/conversation-memory.constant';

export class ConversationMemoryTaskDto {
    @ApiProperty({ enum: ENUM_CONVERSATION_MEMORY_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_CONVERSATION_MEMORY_PROCESS)
    jobName: ENUM_CONVERSATION_MEMORY_PROCESS;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    /** The summary's cursor when queued; none before the first summary. */
    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    fromMessageId?: string;

    /** The last message to fold into the summary. */
    @ApiProperty({ required: true })
    @IsDefined()
    @IsUUID()
    untilMessageId: string;
}
