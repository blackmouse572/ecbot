import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Counts by each customer's first source. Close rate is orders / newCustomers. */
export class TrackedLinkStatsResponseDto {
    @Expose()
    @ApiProperty({ example: 186 })
    newCustomers: number;

    @Expose()
    @ApiProperty({
        example: 44,
        description: 'Asked the price or bought (stage ASKED_PRICE or later)',
    })
    potentialCustomers: number;

    @Expose()
    @ApiProperty({
        example: 21,
        description: 'Confirmed orders since the customer arrived',
    })
    orders: number;
}
