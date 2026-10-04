import { AuthService } from '@app/modules/auth/services/auth.service';
import { ENUM_AUTH_LOGIN_FROM } from '@app/modules/auth/enums/auth.enum';

// AuthService's constructor reads 4 key files from disk; stub the read.
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(() => 'stub-key'),
}));

describe('AuthService.createImpersonationToken', () => {
    const sign = jest.fn(
        (
            _payload: Record<string, unknown>,
            _options: Record<string, unknown>
        ) => 'signed.jwt.value'
    );
    const create = jest.fn(() => new Date('2026-09-02T00:00:00.000Z'));

    const config: Record<string, unknown> = {
        'auth.jwt.accessToken.kid': 'kid-access',
        'auth.jwt.accessToken.privateKeyPath': 'keys/access-token.pem',
        'auth.jwt.accessToken.publicKeyPath': 'keys/access-token.pub',
        'auth.jwt.accessToken.expirationTime': 3600,
        'auth.jwt.refreshToken.kid': 'kid-refresh',
        'auth.jwt.refreshToken.privateKeyPath': 'keys/refresh-token.pem',
        'auth.jwt.refreshToken.publicKeyPath': 'keys/refresh-token.pub',
        'auth.jwt.refreshToken.expirationTime': 604800,
        'auth.jwt.impersonateToken.expirationTime': 600,
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'aud',
        'auth.jwt.issuer': 'iss',
        'auth.jwt.algorithm': 'ES512',
        'auth.password.expiredIn': 1,
        'auth.password.expiredInTemporary': 1,
        'auth.password.saltLength': 8,
        'auth.password.attempt': true,
        'auth.password.maxAttempt': 5,
        'auth.apple.clientId': 'x',
        'auth.apple.signInClientId': 'x',
        'auth.google.clientId': 'x',
        'auth.google.clientSecret': 'x',
    };

    const build = () =>
        new AuthService(
            {} as never, // helperHashService
            { create } as never, // helperDateService
            {} as never, // helperStringService
            { sign } as never, // jwtService
            { get: (k: string) => config[k] } as never // configService
        );

    const target = {
        id: 'target-user-id',
        email: 'target@example.com',
        role: { id: 'role-user-id', type: 'USER' },
    } as never;

    beforeEach(() => jest.clearAllMocks());

    it('signs an access token with the impersonation TTL, no refresh token', () => {
        const service = build();

        const result = service.createImpersonationToken(
            target,
            'session-id',
            'acting-admin-id'
        );

        expect(result).toEqual({
            tokenType: 'Bearer',
            roleType: 'USER',
            expiresIn: 600,
            accessToken: 'signed.jwt.value',
        });
        expect(result).not.toHaveProperty('refreshToken');

        const [payload, options] = sign.mock.calls[0];
        expect(payload).toMatchObject({
            user: 'target-user-id',
            role: 'role-user-id',
            type: 'USER',
            email: 'target@example.com',
            session: 'session-id',
            loginFrom: ENUM_AUTH_LOGIN_FROM.IMPERSONATE,
            impersonatedBy: 'acting-admin-id',
        });
        expect(options).toMatchObject({
            expiresIn: 600,
            subject: 'target-user-id',
        });
    });
});
