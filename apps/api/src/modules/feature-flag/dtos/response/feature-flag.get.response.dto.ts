import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FeatureFlagGetResponseDto {
    @Expose()
    @ApiProperty({ description: 'Đơn hàng: orders, product groups, import' })
    orders: boolean;

    @Expose()
    @ApiProperty({ description: 'Nguồn khách: tracked links and first source' })
    customerSources: boolean;
}
