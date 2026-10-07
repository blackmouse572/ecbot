import { ApiProperty } from '@nestjs/swagger';
import { AuthImpersonateUserDto } from 'src/modules/auth/dtos/response/auth.impersonate-user.response.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export class AuthImpersonateExchangeResponseDto {
    @ApiProperty({ example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ enum: ENUM_POLICY_ROLE_TYPE })
    roleType: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        example: 598,
        description:
            'Seconds the token has left (measured from when it was minted, not from this response)',
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

    @ApiProperty({ description: 'Acting admin user id' })
    impersonatedBy: string;

    @ApiProperty({ type: AuthImpersonateUserDto })
    user: AuthImpersonateUserDto;
}
