import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** A customer's confirmed orders, for the orders section of the customer panel. */
export class OrderSummaryResponseDto {
    @Expose()
    @ApiProperty()
    confirmedOrders: number;

    @Expose()
    @ApiProperty({ description: 'Sum of the confirmed totals, a whole amount' })
    totalSpent: number;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    lastOrderedAt?: Date | null;
}
