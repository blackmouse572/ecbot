import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { AuthSocialGoogleGuard } from '@app/modules/auth/guards/social/auth.social.google.guard';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';

describe('AuthSocialGoogleGuard', () => {
    const configValues: Record<string, any> = {
        'auth.google.header': 'authorization',
        'auth.google.prefix': 'GoogleToken',
    };
    const get = jest.fn((key: string) => configValues[key]);
    const configService = { get } as any;

    const googleGetTokenInfo = jest.fn();
    const authService = { googleGetTokenInfo } as any;

    const buildContext = (headerValue?: string): ExecutionContext => {
        const request: any = {
            headers: headerValue
                ? { authorization: headerValue }
                : {},
        };

        return {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        } as any;
    };

    beforeEach(() => {
        get.mockClear();
        googleGetTokenInfo.mockReset();
    });

    it('rejects with SOCIAL_GOOGLE_REQUIRED when the header is missing', async () => {
        const guard = new AuthSocialGoogleGuard(configService, authService);

        await expect(guard.canActivate(buildContext())).rejects.toMatchObject({
            response: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
            },
        });
    });

    it('sets request.user and allows the request when the token is valid', async () => {
        const payload = {
            email: 'user@example.com',
            emailVerified: true,
            name: 'User',
            photo: 'photo.png',
        };
        googleGetTokenInfo.mockResolvedValue(payload);

        const guard = new AuthSocialGoogleGuard(configService, authService);
        const context = buildContext('GoogleToken token-value');

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            (context.switchToHttp().getRequest() as any).user
        ).toEqual(payload);
    });

    it('wraps an unexpected error into a generic SOCIAL_GOOGLE_INVALID 401', async () => {
        googleGetTokenInfo.mockRejectedValue(new Error('boom'));

        const guard = new AuthSocialGoogleGuard(configService, authService);

        await expect(
            guard.canActivate(buildContext('GoogleToken token-value'))
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_INVALID,
                message: 'auth.error.socialGoogleInvalid',
            },
        });
    });

    it('preserves the unverified-email 401 thrown by the service instead of masking it', async () => {
        googleGetTokenInfo.mockRejectedValue(
            new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_EMAIL_NOT_VERIFIED,
                message: 'auth.error.socialGoogleEmailNotVerified',
            })
        );

        const guard = new AuthSocialGoogleGuard(configService, authService);

        await expect(
            guard.canActivate(buildContext('GoogleToken token-value'))
        ).rejects.toMatchObject({
            response: {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_EMAIL_NOT_VERIFIED,
                message: 'auth.error.socialGoogleEmailNotVerified',
            },
        });
    });
});
