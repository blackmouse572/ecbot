import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { AuthImpersonateRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.impersonate-refresh.response.dto';
import { AuthChangePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.change-password.request.dto';
import { AuthMfaDisableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-disable.request.dto';
import { AuthMfaEnableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-enable.request.dto';
import { AuthMfaRecoveryCodesRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-recovery-codes.request.dto';
import { AuthMfaSetupRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-setup.request.dto';
import { AuthMfaEnableResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-enable.response.dto';
import { AuthMfaSetupResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-setup.response.dto';
import { AuthRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.refresh.response.dto';

export function AuthSharedRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh a token',
        }),
        DocAuth({
            xApiKey: true,
            jwtRefreshToken: true,
        }),
        DocResponse<AuthRefreshResponseDto>('auth.refresh', {
            dto: AuthRefreshResponseDto,
        })
    );
}

export function AuthSharedLogoutDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'end the current session',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('auth.logout')
    );
}

export function AuthSharedChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthChangePasswordRequestDto,
        }),
        DocResponse('auth.changePassword')
    );
}

export function AuthSharedImpersonateEndDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'end an impersonation session',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('auth.impersonateEnd')
    );
}

export function AuthSharedImpersonateRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'renew an impersonation access token',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<AuthImpersonateRefreshResponseDto>(
            'auth.impersonateRefresh',
            { dto: AuthImpersonateRefreshResponseDto }
        )
    );
}

export function AuthSharedMfaSetupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'start MFA setup: a new pending TOTP secret and otpauth URI; needs the current password',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthMfaSetupRequestDto,
        }),
        DocResponse<AuthMfaSetupResponseDto>('auth.mfaSetup', {
            dto: AuthMfaSetupResponseDto,
        })
    );
}

export function AuthSharedMfaEnableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'turn MFA on with the current password and a code from the pending secret; returns recovery codes once and signs out other sessions',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthMfaEnableRequestDto,
        }),
        DocResponse<AuthMfaEnableResponseDto>('auth.mfaEnable', {
            dto: AuthMfaEnableResponseDto,
        })
    );
}

export function AuthSharedMfaDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'turn MFA off; needs the current password and a TOTP or recovery code; signs out other sessions',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthMfaDisableRequestDto,
        }),
        DocResponse('auth.mfaDisable')
    );
}

export function AuthSharedMfaRecoveryCodesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'replace the recovery codes; needs the current password and a TOTP or recovery code',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthMfaRecoveryCodesRequestDto,
        }),
        DocResponse<AuthMfaEnableResponseDto>('auth.mfaRecoveryCodes', {
            dto: AuthMfaEnableResponseDto,
        })
    );
}
