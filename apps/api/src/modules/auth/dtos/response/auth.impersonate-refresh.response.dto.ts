import { ApiProperty } from '@nestjs/swagger';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export class AuthImpersonateRefreshResponseDto {
    @ApiProperty({ example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ enum: ENUM_POLICY_ROLE_TYPE })
    roleType: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        example: 600,
        description:
            'Seconds the new access token is valid for (capped by the session lifetime)',
    })
    expiresIn: number;

    @ApiProperty()
    accessToken: string;

    @ApiProperty({
        example: 1791130000000,
        description:
            'Absolute end of the whole session (ms epoch); renewal stops here',
    })
    sessionEndsAt: number;
}
