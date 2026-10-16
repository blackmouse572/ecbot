import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// A channel the customer is reachable on. The platform's sender id stays
// out: admins need to see the channel, not address the person on it.
export class CustomerAdminContactPointResponseDto {
    @ApiProperty({ example: '5b0e8c1d-2f3a-4b5c-8d9e-0f1a2b3c4d5e' })
    @Expose()
    id: string;

    @ApiProperty({
        enum: ENUM_ACCOUNT_TYPE,
        example: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
    })
    @Expose()
    platform: ENUM_ACCOUNT_TYPE;

    @ApiPropertyOptional({
        example: 'Nguyễn Thị Lan',
        description: 'Name the channel reports for the sender',
    })
    @Expose()
    displayName?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
    @Expose()
    avatar?: string;

    @ApiProperty({ example: new Date('2026-10-01T05:57:59.265Z') })
    @Expose()
    createdAt: Date;
}
