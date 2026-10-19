import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Keep the rest of fs: argon2 and bcrypt find their native binaries through it.
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(() => 'dummy-key'),
}));

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
    })),
}));

import { AuthService } from '@app/modules/auth/services/auth.service';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { HelperHashService } from '@app/common/helper/services/helper.hash.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';

describe('AuthService.googleGetTokenInfo', () => {
    const configValues: Record<string, any> = {
        'auth.jwt.accessToken.kid': 'access-kid',
        'auth.jwt.accessToken.privateKeyPath': 'access-private.pem',
        'auth.jwt.accessToken.publicKeyPath': 'access-public.pem',
        'auth.jwt.accessToken.expirationTime': 3600,
        'auth.jwt.refreshToken.kid': 'refresh-kid',
        'auth.jwt.refreshToken.privateKeyPath': 'refresh-private.pem',
        'auth.jwt.refreshToken.publicKeyPath': 'refresh-public.pem',
        'auth.jwt.refreshToken.expirationTime': 86400,
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'ecbot-audience',
        'auth.jwt.issuer': 'ecbot-issuer',
        'auth.jwt.algorithm': 'RS256',
        'auth.password.expiredIn': 90,
        'auth.password.expiredInTemporary': 1,
        'auth.password.saltLength': 10,
        'auth.password.attempt': true,
        'auth.password.maxAttempt': 5,
        'auth.apple.clientId': 'apple-client-id',
        'auth.apple.signInClientId': 'apple-signin-client-id',
        'auth.google.clientId': 'google-client-id-123',
        'auth.google.clientSecret': 'google-client-secret',
    };
    const get = jest.fn((key: string) => configValues[key]);
    const configService = { get } as any;

    const build = () =>
        new AuthService(
            new HelperHashService(),
            new HelperDateService(configService),
            new HelperStringService(),
            new JwtService(),
            configService
        );

    beforeEach(() => {
        mockVerifyIdToken.mockReset();
    });

    it('passes the configured google client id as the verifyIdToken audience', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({
                email: 'user@example.com',
                email_verified: true,
                name: 'User',
                picture: 'https://example.com/photo.png',
            }),
        });

        const service = build();
        await service.googleGetTokenInfo('id-token');

        expect(mockVerifyIdToken).toHaveBeenCalledWith({
            idToken: 'id-token',
            audience: 'google-client-id-123',
        });
    });

    it('returns the payload when the google account email is verified', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({
                email: 'user@example.com',
                email_verified: true,
                name: 'User',
                picture: 'https://example.com/photo.png',
            }),
        });

        const service = build();
        const result = await service.googleGetTokenInfo('id-token');

        expect(result).toEqual({
            email: 'user@example.com',
            emailVerified: true,
            name: 'User',
            photo: 'https://example.com/photo.png',
        });
    });

    it('rejects with a 401 i18n error when the google account email is not verified', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({
                email: 'user@example.com',
                email_verified: false,
                name: 'User',
                picture: 'https://example.com/photo.png',
            }),
        });

        const service = build();

        await expect(service.googleGetTokenInfo('id-token')).rejects.toThrow(
            UnauthorizedException
        );

        try {
            await service.googleGetTokenInfo('id-token');
            fail('expected googleGetTokenInfo to throw');
        } catch (err) {
            expect(err).toBeInstanceOf(UnauthorizedException);
            expect(err.getResponse()).toEqual({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_EMAIL_NOT_VERIFIED,
                message: 'auth.error.socialGoogleEmailNotVerified',
            });
        }
    });

    it('rejects when the google account email_verified field is missing', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({
                email: 'user@example.com',
                name: 'User',
                picture: 'https://example.com/photo.png',
            }),
        });

        const service = build();

        await expect(service.googleGetTokenInfo('id-token')).rejects.toThrow(
            UnauthorizedException
        );
    });
});

// Passwords used to be bcrypt hashes. They still verify, and
// loginWithCredential calls maybeRehashPassword after a successful check so
// each one moves to argon2id the next time its owner logs in.
describe('AuthService.maybeRehashPassword', () => {
    const configValues: Record<string, any> = {
        'auth.jwt.accessToken.kid': 'access-kid',
        'auth.jwt.accessToken.privateKeyPath': 'access-private.pem',
        'auth.jwt.accessToken.publicKeyPath': 'access-public.pem',
        'auth.jwt.accessToken.expirationTime': 3600,
        'auth.jwt.refreshToken.kid': 'refresh-kid',
        'auth.jwt.refreshToken.privateKeyPath': 'refresh-private.pem',
        'auth.jwt.refreshToken.publicKeyPath': 'refresh-public.pem',
        'auth.jwt.refreshToken.expirationTime': 86400,
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'ecbot-audience',
        'auth.jwt.issuer': 'ecbot-issuer',
        'auth.jwt.algorithm': 'RS256',
        'auth.password.expiredIn': 90,
        'auth.password.expiredInTemporary': 1,
        'auth.password.saltLength': 12,
        'auth.password.attempt': true,
        'auth.password.maxAttempt': 5,
        'auth.apple.clientId': 'apple-client-id',
        'auth.apple.signInClientId': 'apple-signin-client-id',
        'auth.google.clientId': 'google-client-id-123',
        'auth.google.clientSecret': 'google-client-secret',
    };
    const get = jest.fn((key: string) => configValues[key]);
    const configService = { get } as any;
    const hashService = new HelperHashService();

    const build = () =>
        new AuthService(
            hashService,
            new HelperDateService(configService),
            new HelperStringService(),
            new JwtService(),
            configService
        );

    it('rehashes a bcrypt password into argon2id', async () => {
        const service = build();
        const bcryptHash =
            '$2b$12$7h8fVhgeM2bD0rQ/64T6yOMnJHvi3H2/5oMGYi.CIPdg35uAvg0k2';

        const result = await service.maybeRehashPassword(
            'aaAA@123',
            bcryptHash
        );

        expect(result).not.toBeNull();
        expect(result.passwordHash.startsWith('$argon2id$')).toBe(true);
        expect(
            await hashService.passwordVerify('aaAA@123', result.passwordHash)
        ).toBe(true);
    });

    it('does not rehash a current argon2id password', async () => {
        const service = build();
        const current = await hashService.passwordHash('CorrectPass1!');

        const result = await service.maybeRehashPassword(
            'CorrectPass1!',
            current
        );

        expect(result).toBeNull();
    });
});

// Hashing a password is slow on purpose; it must run off the event loop.
describe('password hashing does not block the event loop', () => {
    const hashService = new HelperHashService();

    it('HelperHashService.passwordHash and passwordVerify are async', async () => {
        const hashing = hashService.passwordHash('pw');
        expect(hashing).toBeInstanceOf(Promise);
        const hash = await hashing;

        const comparing = hashService.passwordVerify('pw', hash);
        expect(comparing).toBeInstanceOf(Promise);
        expect(await comparing).toBe(true);
        expect(await hashService.passwordVerify('nope', hash)).toBe(false);
    });

    it('AuthService validateUser / runDummyPasswordCompare / createPassword are async and correct', async () => {
        const configService = {
            get: jest.fn((key: string) => {
                if (key === 'auth.password.saltLength') return 4;
                if (key.endsWith('KeyPath')) return 'key.pem';
                return undefined;
            }),
        } as any;
        const service = new AuthService(
            hashService,
            new HelperDateService(configService),
            new HelperStringService(),
            new JwtService(),
            configService
        );

        const creating = service.createPassword('Secret1!');
        expect(creating).toBeInstanceOf(Promise);
        const { passwordHash } = await creating;

        const validating = service.validateUser('Secret1!', passwordHash);
        expect(validating).toBeInstanceOf(Promise);
        expect(await validating).toBe(true);
        expect(await service.validateUser('wrong', passwordHash)).toBe(false);

        const dummy = service.runDummyPasswordCompare('anything');
        expect(dummy).toBeInstanceOf(Promise);
        await expect(dummy).resolves.toBeUndefined();
    });
});
