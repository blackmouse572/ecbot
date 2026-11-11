import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { ORDER_IMPORT_MAX_ROWS } from '../../constants/order.constant';
import { OrderImportRowRequestDto } from './order-import-row.request.dto';

export class OrderImportRequestDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(ORDER_IMPORT_MAX_ROWS)
    @ValidateNested({ each: true })
    @Type(() => OrderImportRowRequestDto)
    @ApiProperty({ type: [OrderImportRowRequestDto] })
    rows: OrderImportRowRequestDto[];

    @IsOptional()
    @IsBoolean()
    @ApiProperty({
        required: false,
        description: 'Count what would be imported without writing anything',
    })
    dryRun?: boolean;
}
