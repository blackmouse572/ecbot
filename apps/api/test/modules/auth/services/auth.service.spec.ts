import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

jest.mock('fs', () => ({
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

// Fix round 1 (Task 18): existing hashes created before the bcrypt cost was
// raised (8 → 12) still verify fine (bcrypt reads the cost back out of the
// hash string), but stay that much cheaper to brute-force forever unless
// they're re-hashed. loginWithCredential calls maybeRehashPassword after a
// successful password check to upgrade them opportunistically.
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

    it("rehashes a password whose stored hash's cost is below the configured cost (8 → 12)", async () => {
        const service = build();
        const weakHash = await hashService.bcrypt(
            'CorrectPass1!',
            hashService.randomSalt(8)
        );

        const result = await service.maybeRehashPassword(
            'CorrectPass1!',
            weakHash
        );

        expect(result).not.toBeNull();
        expect(result.passwordHash).not.toEqual(weakHash);
        expect(
            await hashService.bcryptCompare(
                'CorrectPass1!',
                result.passwordHash
            )
        ).toBe(true);
        expect(hashService.bcryptGetCost(result.passwordHash)).toBe(12);
    });

    it('does not rehash when the stored hash is already at the configured cost', async () => {
        const service = build();
        const strongHash = await hashService.bcrypt(
            'CorrectPass1!',
            hashService.randomSalt(12)
        );

        const result = await service.maybeRehashPassword(
            'CorrectPass1!',
            strongHash
        );

        expect(result).toBeNull();
    });

    it('does not rehash when the stored hash is above the configured cost', async () => {
        const service = build();
        const strongerHash = await hashService.bcrypt(
            'CorrectPass1!',
            hashService.randomSalt(13)
        );

        const result = await service.maybeRehashPassword(
            'CorrectPass1!',
            strongerHash
        );

        expect(result).toBeNull();
    });
});

// bcrypt at cost 12 takes ~250 ms; the sync variants blocked the event loop
// for that long on every (unauthenticated) login. Everything is async now.
describe('password hashing does not block the event loop', () => {
    const hashService = new HelperHashService();

    it('HelperHashService.bcrypt and bcryptCompare are async', async () => {
        const hashing = hashService.bcrypt('pw', hashService.randomSalt(4));
        expect(hashing).toBeInstanceOf(Promise);
        const hash = await hashing;

        const comparing = hashService.bcryptCompare('pw', hash);
        expect(comparing).toBeInstanceOf(Promise);
        expect(await comparing).toBe(true);
        expect(await hashService.bcryptCompare('nope', hash)).toBe(false);
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
