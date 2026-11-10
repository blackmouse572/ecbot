import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OrderImportInvalidRowResponseDto {
    @Expose()
    @ApiProperty({ description: 'Row number in the file, from 1', example: 7 })
    row: number;

    @Expose()
    @ApiProperty({
        enum: ['missingPhone', 'badDate', 'empty', 'failed'],
        example: 'missingPhone',
    })
    reason: 'missingPhone' | 'badDate' | 'empty' | 'failed';
}
