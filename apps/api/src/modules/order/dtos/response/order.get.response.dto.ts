import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../../enums/order.enum';
import { OrderItemGetResponseDto } from './order-item.get.response.dto';

export class OrderGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    code: string;

    @Expose()
    @ApiProperty()
    customerId: string;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    customerName?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    customerPhone?: string | null;

    @Expose()
    @ApiProperty({ description: 'Minor units' })
    total: number;

    @Expose()
    @ApiProperty()
    currency: string;

    @Expose()
    @ApiProperty({ enum: ENUM_ORDER_STATUS })
    status: ENUM_ORDER_STATUS;

    @Expose()
    @ApiProperty({ enum: ENUM_ORDER_SOURCE })
    source: ENUM_ORDER_SOURCE;

    @Expose()
    @ApiProperty()
    orderedAt: Date;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    confirmedAt?: Date | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    note?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    conversationId?: string | null;

    @Expose()
    @Type(() => OrderItemGetResponseDto)
    @ApiProperty({ type: [OrderItemGetResponseDto] })
    items: OrderItemGetResponseDto[];

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
