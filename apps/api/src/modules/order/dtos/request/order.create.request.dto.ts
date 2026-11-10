import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { ENUM_ORDER_STATUS } from '../../enums/order.enum';
import { OrderItemRequestDto } from './order-item.request.dto';

export class OrderCreateRequestDto {
    @IsUUID()
    @ApiProperty()
    customerId: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiProperty({
        required: false,
        description: 'Generated as DH-YYMMDD-XXXX when left out',
    })
    code?: string;

    @IsArray()
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => OrderItemRequestDto)
    @ApiProperty({ type: [OrderItemRequestDto] })
    items: OrderItemRequestDto[];

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiProperty({
        required: false,
        description:
            'Order total in minor units. Left out, it is the sum of the items',
    })
    total?: number;

    @IsOptional()
    @IsString()
    @Length(3, 3)
    @ApiProperty({ required: false, example: 'VND' })
    currency?: string;

    @IsOptional()
    @IsEnum([ENUM_ORDER_STATUS.PENDING, ENUM_ORDER_STATUS.CONFIRMED])
    @ApiProperty({
        required: false,
        enum: [ENUM_ORDER_STATUS.PENDING, ENUM_ORDER_STATUS.CONFIRMED],
        default: ENUM_ORDER_STATUS.CONFIRMED,
    })
    status?: ENUM_ORDER_STATUS.PENDING | ENUM_ORDER_STATUS.CONFIRMED;

    @IsOptional()
    @IsDateString()
    @ApiProperty({ required: false, description: 'Defaults to now' })
    orderedAt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    @ApiProperty({ required: false })
    note?: string;
}
