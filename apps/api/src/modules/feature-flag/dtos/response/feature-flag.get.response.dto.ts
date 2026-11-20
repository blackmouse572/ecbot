import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FeatureFlagGetResponseDto {
    @Expose()
    @ApiProperty({ description: 'Đơn hàng: orders, product groups, import' })
    orders: boolean;

    @Expose()
    @ApiProperty({ description: 'Nguồn khách: tracked links and first source' })
    customerSources: boolean;

    @Expose()
    @ApiProperty({ description: 'Tiếp thị v2: Tổng quan, sending by stage' })
    marketing: boolean;
}
