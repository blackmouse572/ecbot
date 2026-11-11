import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { OrderImportInvalidRowResponseDto } from './order-import-invalid-row.response.dto';

export class OrderImportResponseDto {
    @Expose()
    @ApiProperty({ description: 'True when nothing was written' })
    dryRun: boolean;

    @Expose()
    @ApiProperty({ description: 'Orders imported, or that would be' })
    orders: number;

    @Expose()
    @ApiProperty({ description: 'Orders whose code already exists' })
    skipped: number;

    @Expose()
    @ApiProperty({ description: 'Customers created from unknown phones' })
    newCustomers: number;

    @Expose()
    @ApiProperty({ type: [String], description: 'Product groups created' })
    newGroups: string[];

    @Expose()
    @Type(() => OrderImportInvalidRowResponseDto)
    @ApiProperty({ type: [OrderImportInvalidRowResponseDto] })
    invalidRows: OrderImportInvalidRowResponseDto[];
}
