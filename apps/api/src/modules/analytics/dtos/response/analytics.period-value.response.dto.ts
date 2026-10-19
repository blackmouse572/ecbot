import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** A number for the period and the same number for the period before. */
export class AnalyticsPeriodValueDto {
    @Expose()
    @ApiProperty({ example: 18.4 })
    current: number;

    @Expose()
    @ApiProperty({ example: 15.1 })
    previous: number;
}
