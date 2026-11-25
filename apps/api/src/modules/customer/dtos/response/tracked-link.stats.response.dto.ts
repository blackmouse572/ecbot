import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Counts for one link. Close rate is orders / (newCustomers + returningCustomers). */
export class TrackedLinkStatsResponseDto {
    @Expose()
    @ApiProperty({ example: 186 })
    newCustomers: number;

    @Expose()
    @ApiProperty({
        example: 17,
        description:
            'Earlier customers (first source elsewhere) who later arrived through this link',
    })
    returningCustomers: number;

    @Expose()
    @ApiProperty({
        example: 44,
        description:
            'New or returning, and asked the price or bought (stage ASKED_PRICE or later)',
    })
    potentialCustomers: number;

    @Expose()
    @ApiProperty({
        example: 21,
        description:
            'Confirmed orders whose last arrival before the order was through this link',
    })
    orders: number;
}
