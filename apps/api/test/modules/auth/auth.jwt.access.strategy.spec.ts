import { UnauthorizedException } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@app/modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';

describe('AuthJwtAccessStrategy', () => {
    const configValues: Record<string, any> = {
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'audience',
        'auth.jwt.issuer': 'issuer',
        'auth.jwt.jwksUri': 'https://example.com/.well-known/jwks.json',
        'auth.jwt.algorithm': 'ES512',
    };
    const get = jest.fn((key: string) => configValues[key]);
    const configService = { get } as any;

    const findLoginSession = jest.fn();
    const touchLastActive = jest.fn();
    const sessionService = { findLoginSession, touchLastActive } as any;

    const payload: IAuthJwtAccessTokenPayload = {
        loginDate: new Date(),
        loginFrom: 'CREDENTIAL' as any,
        user: 'user-1',
        email: 'user@example.com',
        session: 'session-1',
        role: 'role-1',
        type: 'individual' as any,
    };

    beforeEach(() => {
        get.mockClear();
        findLoginSession.mockReset();
        touchLastActive.mockReset().mockResolvedValue(undefined);
    });

    it('rejects with the access-token unauthorized 401 when the login session was revoked', async () => {
        findLoginSession.mockResolvedValue(undefined);

        const strategy = new AuthJwtAccessStrategy(configService, sessionService);

        await expect(strategy.validate(payload)).rejects.toMatchObject({
            response: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            },
        });
        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
            UnauthorizedException
        );
        expect(touchLastActive).not.toHaveBeenCalled();
    });

    it('returns the payload and touches last-active when the login session is active', async () => {
        findLoginSession.mockResolvedValue({ user: 'user-1' });

        const strategy = new AuthJwtAccessStrategy(configService, sessionService);

        await expect(strategy.validate(payload)).resolves.toEqual(payload);
        expect(findLoginSession).toHaveBeenCalledWith('session-1');
        expect(touchLastActive).toHaveBeenCalledWith('session-1');
    });
});
