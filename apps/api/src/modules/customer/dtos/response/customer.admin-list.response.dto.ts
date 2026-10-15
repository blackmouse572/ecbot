import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ActivityAdminWorkspaceResponseDto } from 'src/modules/activity/dtos/response/activity.admin-workspace.response.dto';
import { CustomerAdminTagResponseDto } from './customer.admin-tag.response.dto';

// One row of the admin customer list. An allowlist, never a spread of the
// entity: the customer carries agent-written metadata, and the workspace its
// invitation code.
export class CustomerAdminListResponseDto {
    @ApiProperty({ example: '0d6f7a52-8b1c-4f3e-9c2a-6e5d4b3a2f10' })
    @Expose()
    id: string;

    @ApiPropertyOptional({ example: 'Nguyễn Thị Lan' })
    @Expose()
    name?: string;

    @ApiPropertyOptional({
        example: 'Nguyễn Thị Lan',
        description:
            'The customer name, or else the name their first channel reports',
    })
    @Expose()
    displayName?: string;

    @ApiPropertyOptional({ example: '0901234567' })
    @Expose()
    phone?: string;

    @ApiPropertyOptional({ example: 'lan@example.com' })
    @Expose()
    email?: string;

    @ApiPropertyOptional({
        example: 'https://cdn.example.com/avatar.png',
        description: 'Avatar of the first channel that has one',
    })
    @Expose()
    avatar?: string;

    @ApiProperty({ type: ActivityAdminWorkspaceResponseDto })
    @Expose()
    @Type(() => ActivityAdminWorkspaceResponseDto)
    workspace: ActivityAdminWorkspaceResponseDto;

    @ApiProperty({ example: 2 })
    @Expose()
    contactPointCount: number;

    @ApiProperty({
        enum: ENUM_ACCOUNT_TYPE,
        isArray: true,
        example: [ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, ENUM_ACCOUNT_TYPE.ZALO_PAGE],
        description: 'Distinct channel types the customer is reachable on',
    })
    @Expose()
    channels: ENUM_ACCOUNT_TYPE[];

    @ApiProperty({ type: [CustomerAdminTagResponseDto] })
    @Expose()
    @Type(() => CustomerAdminTagResponseDto)
    tags: CustomerAdminTagResponseDto[];

    @ApiProperty({ example: new Date('2026-10-01T05:57:59.265Z') })
    @Expose()
    createdAt: Date;

    @ApiPropertyOptional({ example: new Date('2026-10-02T01:15:36.079Z') })
    @Expose()
    updatedAt?: Date;
}
