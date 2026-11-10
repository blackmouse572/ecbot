import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OrderItemGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    productGroupId?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    productGroupName?: string | null;

    @Expose()
    @ApiProperty()
    quantity: number;

    @Expose()
    @ApiProperty({ type: Number, required: false, nullable: true })
    unitPrice?: number | null;
}
