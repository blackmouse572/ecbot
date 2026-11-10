import { ApiProperty } from '@nestjs/swagger';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { ENUM_ORDER_STATUS } from '../../enums/order.enum';

// One CSV row after column mapping. Fields stay loose (phone and date as
// text) so a bad row is reported back instead of failing the whole file.
export class OrderImportRowRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(64)
    @ApiProperty({ required: false, example: 'SP-102394' })
    code?: string;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    @ApiProperty({ required: false, example: '0903412885' })
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    @ApiProperty({ required: false, example: 'Nguyễn Thu Hà' })
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiProperty({ required: false, example: 'Kem chống nắng SPF50' })
    item?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    @ApiProperty({ required: false, example: 'Kem chống nắng' })
    group?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @ApiProperty({ required: false, example: 2 })
    quantity?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiProperty({
        required: false,
        description: 'Price of one unit in minor units',
        example: 345000,
    })
    unitPrice?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiProperty({
        required: false,
        description: 'Order total in minor units',
        example: 690000,
    })
    total?: number;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    @ApiProperty({
        required: false,
        description: 'ISO date or dd/mm/yyyy, optionally with hh:mm',
        example: '02/10/2026',
    })
    orderedAt?: string;

    @IsOptional()
    @IsIn([ENUM_ORDER_STATUS.PENDING, ENUM_ORDER_STATUS.CONFIRMED])
    @ApiProperty({
        required: false,
        enum: [ENUM_ORDER_STATUS.PENDING, ENUM_ORDER_STATUS.CONFIRMED],
        description: 'Defaults to CONFIRMED',
    })
    status?: ENUM_ORDER_STATUS.PENDING | ENUM_ORDER_STATUS.CONFIRMED;
}
