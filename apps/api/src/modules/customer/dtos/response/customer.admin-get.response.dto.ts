import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CustomerAdminContactPointResponseDto } from './customer.admin-contact-point.response.dto';
import { CustomerAdminListResponseDto } from './customer.admin-list.response.dto';

// The fields the workspace customer page shows, plus channels and a
// conversation count. Agent-written metadata stays out.
export class CustomerAdminGetResponseDto extends CustomerAdminListResponseDto {
    @ApiPropertyOptional({ example: 'vi' })
    @Expose()
    language?: string;

    @ApiPropertyOptional({ example: 'Thích bánh ít ngọt' })
    @Expose()
    notes?: string;

    @ApiPropertyOptional({ example: 'Khách quen, hay đặt bánh sinh nhật' })
    @Expose()
    profileSummary?: string;

    @ApiPropertyOptional({
        example: '4f3e2d1c-0b9a-4876-9543-210fedcba987',
        description: 'Set when this profile was merged into another customer',
    })
    @Expose()
    mergedIntoCustomerId?: string;

    @ApiProperty({ example: 4 })
    @Expose()
    conversationCount: number;

    @ApiProperty({ type: [CustomerAdminContactPointResponseDto] })
    @Expose()
    @Type(() => CustomerAdminContactPointResponseDto)
    contactPoints: CustomerAdminContactPointResponseDto[];
}
