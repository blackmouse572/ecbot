import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { ENUM_CONVERSATION_STATUS } from '../../enums/conversation.enum';

export class ConversationUpdateStatusRequestDto {
    @IsEnum(ENUM_CONVERSATION_STATUS)
    @IsNotEmpty()
    @ApiProperty({
        description: 'Target lifecycle status for the conversation',
        enum: ENUM_CONVERSATION_STATUS,
        example: ENUM_CONVERSATION_STATUS.RESOLVED,
    })
    status: ENUM_CONVERSATION_STATUS;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    @ApiProperty({
        description: 'Optional reason for the status change',
        example: 'Issue handled',
        required: false,
    })
    reason?: string;
}
