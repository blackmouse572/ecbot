import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsUUID } from 'class-validator';
import { ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS } from '../constants/customer-marketing-backfill.constant';

export class CustomerMarketingBackfillTaskDto {
    @ApiProperty({
        enum: ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS,
        required: true,
    })
    @IsDefined()
    @IsEnum(ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS)
    jobName: ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsUUID()
    runId: string;
}
