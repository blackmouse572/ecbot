import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsUUID } from 'class-validator';
import { ENUM_MARKETING_SEND_PROCESS } from '../enums/marketing-send.enum';

export class MarketingSendTaskDto {
    @ApiProperty({ enum: ENUM_MARKETING_SEND_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_MARKETING_SEND_PROCESS)
    jobName: ENUM_MARKETING_SEND_PROCESS;

    @ApiProperty({ required: true, description: 'The marketing_messages row' })
    @IsDefined()
    @IsUUID()
    messageId: string;
}
