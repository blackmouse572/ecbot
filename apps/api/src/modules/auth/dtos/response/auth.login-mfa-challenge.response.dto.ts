import { ApiProperty } from '@nestjs/swagger';

// Returned by the login endpoints instead of tokens when the user has MFA on.
export class AuthLoginMfaChallengeResponseDto {
    @ApiProperty({ required: true, example: true })
    mfaRequired: true;

    @ApiProperty({
        required: true,
        description: 'Short-lived, single-use challenge for /auth/login/mfa',
    })
    mfaToken: string;

    @ApiProperty({ required: true, example: 300, description: 'seconds' })
    expiresIn: number;
}
