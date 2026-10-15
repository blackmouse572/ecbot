import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// A tag on a customer row: enough to show and link it, nothing more.
export class CustomerAdminTagResponseDto {
    @ApiProperty({ example: 'e572d33e-dbc3-45f2-857b-1ce34654d81c' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Khách VIP' })
    @Expose()
    name: string;

    @ApiPropertyOptional({ example: '⭐' })
    @Expose()
    emoji?: string;
}
