import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ORDER_IMPORT_INVALID_REASONS } from '../../constants/order.constant';
import { OrderImportInvalidReason } from '../../interfaces/order.interface';

export class OrderImportInvalidRowResponseDto {
    @Expose()
    @ApiProperty({ description: 'Row number in the file, from 1', example: 7 })
    row: number;

    @Expose()
    @ApiProperty({
        enum: ORDER_IMPORT_INVALID_REASONS,
        example: 'missingPhone',
    })
    reason: OrderImportInvalidReason;
}
