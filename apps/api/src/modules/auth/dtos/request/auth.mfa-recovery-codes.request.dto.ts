import { AuthMfaDisableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-disable.request.dto';

/** Same proof as turning MFA off: the current password and a valid code. */
export class AuthMfaRecoveryCodesRequestDto extends AuthMfaDisableRequestDto {}
