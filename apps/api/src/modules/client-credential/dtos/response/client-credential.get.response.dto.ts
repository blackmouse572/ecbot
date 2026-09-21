import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

// List/detail view — metadata only. The secret is never returned here; it is
// shown once at creation (and, in slice #289, on rotation). See ADR-0012.
export class ClientCredentialGetResponseDto extends DatabaseDto {
    @ApiHideProperty()
    @Exclude()
    hash: string;

    @ApiProperty({
        description: 'Human-friendly name of the client credential',
        example: 'Luettgen Group',
        required: true,
    })
    name: string;

    @ApiProperty({
        description: 'Public key part of the credential (safe to display)',
        example: 'wbWPYhNlenP7VxFHMJVy09IIK',
        required: true,
    })
    key: string;

    @ApiProperty({
        description: 'Whether the credential is currently active',
        example: true,
        required: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Start date the credential becomes valid',
        example: new Date('2026-03-08T22:40:59.479Z'),
        required: false,
    })
    startDate?: Date;

    @ApiProperty({
        description: 'End date the credential expires',
        example: new Date('2027-04-17T18:23:15.628Z'),
        required: false,
    })
    endDate?: Date;
}
