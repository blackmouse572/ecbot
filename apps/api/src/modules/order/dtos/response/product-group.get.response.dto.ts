import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProductGroupGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ type: Number, required: false, nullable: true })
    defaultRepurchaseDays?: number | null;

    @Expose()
    @ApiProperty({ type: Number, required: false, nullable: true })
    learnedRepurchaseDays?: number | null;

    @Expose()
    @ApiProperty({
        type: Number,
        required: false,
        nullable: true,
        description:
            'The cycle in use: the learned one when there is enough data, else the default',
    })
    repurchaseDays?: number | null;

    @Expose()
    @ApiProperty({
        required: false,
        description: 'Confirmed orders holding the group (list only)',
    })
    confirmedOrders?: number;

    @Expose()
    @ApiProperty({
        required: false,
        description:
            'Customers with a confirmed order of the group (list only)',
    })
    customers?: number;

    @Expose()
    @ApiProperty({
        required: false,
        description:
            'Gaps of a day or more between two confirmed orders of one customer; the cycle is learned from 5 (list only)',
    })
    repurchasePairs?: number;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
