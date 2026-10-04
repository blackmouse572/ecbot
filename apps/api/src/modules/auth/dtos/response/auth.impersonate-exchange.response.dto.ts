import { ApiProperty } from '@nestjs/swagger';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

class AuthImpersonateUserDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    email: string;
}

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

    @ApiProperty({ description: 'Acting admin user id' })
    impersonatedBy: string;

    @ApiProperty({ type: AuthImpersonateUserDto })
    user: AuthImpersonateUserDto;
}
