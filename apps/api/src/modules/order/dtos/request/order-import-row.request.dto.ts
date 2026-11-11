import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ENUM_ORDER_STATUS } from '../../enums/order.enum';

// A client that already parsed the number may send it as one.
const cellText = ({ value }: { value: unknown }) =>
    typeof value === 'number' ? String(value) : value;

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

    // Numbers arrive as the cell text ("345.000", "1,500,000đ") and are
    // parsed per row, so one bad cell is a bad row, not a rejected file.
    @IsOptional()
    @Transform(cellText)
    @IsString()
    @MaxLength(32)
    @ApiProperty({ required: false, example: '2' })
    quantity?: string;

    @IsOptional()
    @Transform(cellText)
    @IsString()
    @MaxLength(32)
    @ApiProperty({
        required: false,
        description: 'Price of one unit, a whole amount',
        example: '345.000',
    })
    unitPrice?: string;

    @IsOptional()
    @Transform(cellText)
    @IsString()
    @MaxLength(32)
    @ApiProperty({
        required: false,
        description: 'Order total, a whole amount',
        example: '690.000',
    })
    total?: string;

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
