import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { OrderItemRequestDto } from './order-item.request.dto';

export class OrderUpdateRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiProperty({ required: false })
    code?: string;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => OrderItemRequestDto)
    @ApiProperty({
        type: [OrderItemRequestDto],
        required: false,
        description: 'Replaces all items',
    })
    items?: OrderItemRequestDto[];

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiProperty({ required: false })
    total?: number;

    @IsOptional()
    @IsDateString()
    @ApiProperty({ required: false })
    orderedAt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    @ApiProperty({ type: String, required: false, nullable: true })
    note?: string | null;
}
