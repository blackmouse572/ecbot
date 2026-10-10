import { AuthSignUpResponseDto } from '@app/modules/auth/dtos/response/auth.signup.response.dto';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiProduces } from '@nestjs/swagger';
import {
    Doc,
    DocAuth,
    DocOneOf,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { AuthImpersonateExchangeRequestDto } from 'src/modules/auth/dtos/request/auth.impersonate-exchange.request.dto';
import { AuthLoginMfaRequestDto } from 'src/modules/auth/dtos/request/auth.login-mfa.request.dto';
import { AuthLoginRequestDto } from 'src/modules/auth/dtos/request/auth.login.request.dto';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
import { AuthImpersonateExchangeResponseDto } from 'src/modules/auth/dtos/response/auth.impersonate-exchange.response.dto';
import { AuthLoginMfaChallengeResponseDto } from 'src/modules/auth/dtos/response/auth.login-mfa-challenge.response.dto';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';

const MFA_CHALLENGE_NOTE =
    'When the user has MFA on, the data is { mfaRequired: true, mfaToken, expiresIn } instead of tokens; finish with POST /auth/login/mfa.';

// Tokens, or the MFA challenge that replaces them when MFA is on.
function DocLoginResponse(messagePath: string): MethodDecorator {
    return applyDecorators(
        ApiProduces('application/json'),
        DocOneOf(
            HttpStatus.OK,
            {
                messagePath,
                statusCode: HttpStatus.OK,
                dto: AuthLoginResponseDto,
            },
            {
                messagePath,
                statusCode: HttpStatus.OK,
                dto: AuthLoginMfaChallengeResponseDto,
            }
        )
    );
}

export function AuthPublicLoginMfaDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Finish an MFA login with an authenticator or recovery code',
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthLoginMfaRequestDto,
        }),
        DocResponse<AuthLoginResponseDto>('auth.loginWithMfa', {
            dto: AuthLoginResponseDto,
        })
    );
}

export function AuthPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with email and password',
            description: MFA_CHALLENGE_NOTE,
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthLoginRequestDto,
        }),
        DocLoginResponse('auth.loginWithCredential')
    );
}

export function AuthPublicImpersonateExchangeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Exchange a single-use impersonation code for an access token',
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthImpersonateExchangeRequestDto,
        }),
        DocResponse<AuthImpersonateExchangeResponseDto>(
            'auth.impersonateExchange',
            {
                dto: AuthImpersonateExchangeResponseDto,
            }
        )
    );
}

export function AuthPublicLoginSocialGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with social google',
            description: MFA_CHALLENGE_NOTE,
        }),
        DocAuth({ xApiKey: true, google: true }),
        DocLoginResponse('auth.loginWithSocialGoogle')
    );
}

export function AuthPublicLoginSocialAppleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with social apple',
            description: MFA_CHALLENGE_NOTE,
        }),
        DocAuth({ xApiKey: true, apple: true }),
        DocLoginResponse('auth.loginWithSocialApple')
    );
}

export function AuthPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Sign up',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthSignUpRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<AuthSignUpResponseDto>('auth.signUp', {
            httpStatus: HttpStatus.CREATED,
            dto: AuthSignUpResponseDto,
        })
    );
}
