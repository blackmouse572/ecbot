import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ENUM_MARKETING_BACKFILL_STATUS } from '../../enums/customer-marketing.enum';

/** Progress of the workspace's 90-day marketing backfill. */
export class MarketingBackfillGetResponseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_BACKFILL_STATUS })
    status: ENUM_MARKETING_BACKFILL_STATUS;

    @Expose()
    @ApiProperty({ required: false, description: 'Conversations to read' })
    total?: number;

    @Expose()
    @ApiProperty({ required: false, description: 'Conversations read so far' })
    processed?: number;

    @Expose()
    @ApiProperty({
        required: false,
        description:
            'Running, but no batch has finished for 15 minutes. Starting it again resumes it.',
    })
    stalled?: boolean;

    @Expose()
    @ApiProperty({ required: false })
    startedAt?: Date;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    finishedAt?: Date | null;
}
