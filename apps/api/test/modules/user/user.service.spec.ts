import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { ENUM_FILE_MIME_IMAGE } from '@app/common/file/enums/file.enum';
import {
    USER_TERMS_PROMPT_ENABLED,
    USER_TERMS_VERSION,
} from '@app/modules/user/constants/user.constant';

// Global setup (test/modules/account/setup.ts) stubs UserService with an
// empty class for specs that only need it as a DI placeholder. This spec
// tests the real UserService, so re-mock the module with its actual
// implementation (same pattern as workspace-scoped.decorator.spec.ts).
jest.mock('@app/modules/user/services/user.service', () =>
    jest.requireActual('@app/modules/user/services/user.service')
);
const { UserService } = jest.requireActual<{
    UserService: typeof import('@app/modules/user/services/user.service').UserService;
}>('@app/modules/user/services/user.service');
type UserService = InstanceType<typeof UserService>;

describe('UserService - exact email lookups (Task 12)', () => {
    let service: UserService;

    const mockEm = {
        findOne: jest.fn(),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
    };

    const mockUserRepository = {};
    const mockHelperDateService = {};

    const mockConfigService = {
        get: jest.fn((key: string) => {
            switch (key) {
                case 'user.usernamePrefix':
                    return 'user_';
                case 'user.usernamePattern':
                    return /^[a-z0-9_]+$/;
                default:
                    return undefined;
            }
        }),
    };

    const mockHelperStringService = {};
    const mockHelperAvatarService = {};

    beforeEach(() => {
        jest.clearAllMocks();
        mockEm.findOne.mockResolvedValue(null);
        service = new UserService(
            mockUserRepository as any,
            mockEm as any,
            mockHelperDateService as any,
            mockConfigService as any,
            mockHelperStringService as any,
            mockHelperAvatarService as any
        );
    });

    describe('findOneByEmail', () => {
        it('looks up by exact lowercase equality instead of $ilike', async () => {
            await service.findOneByEmail('John.Smith@Example.com');

            expect(mockEm.findOne).toHaveBeenCalledWith(
                UserEntity,
                { email: 'john.smith@example.com' },
                {}
            );
        });

        it('does not let "_" act as a wildcard (look-alike addresses must not match)', async () => {
            await service.findOneByEmail('john_smith@x.com');

            const [, filter] = mockEm.findOne.mock.calls[0];
            // An exact-equality filter for 'john_smith@x.com' can never match a
            // stored 'john.smith@x.com' row, unlike the old $ilike filter where
            // '_' matched any single character.
            expect(filter).toEqual({ email: 'john_smith@x.com' });
            expect(filter.email).not.toBe('john.smith@x.com');
        });
    });

    describe('findByEmailOrMobileNumber', () => {
        it('matches email exactly (lowercased) inside the $or clause', async () => {
            await service.findByEmailOrMobileNumber('John.Smith@Example.com');

            expect(mockEm.findOne).toHaveBeenCalledWith(
                UserEntity,
                {
                    $or: [
                        { email: 'john.smith@example.com' },
                        {
                            mobileNumber: {
                                number: 'John.Smith@Example.com',
                            },
                        },
                    ],
                },
                {}
            );
        });
    });

    describe('findByEmailOrUsername', () => {
        it('matches email exactly but leaves username fuzzy ($ilike)', async () => {
            await service.findByEmailOrUsername('John.Smith@Example.com');

            expect(mockEm.findOne).toHaveBeenCalledWith(
                UserEntity,
                {
                    $or: [
                        { email: 'john.smith@example.com' },
                        {
                            username: {
                                $ilike: 'John.Smith@Example.com',
                            },
                        },
                    ],
                },
                {}
            );
        });
    });

    describe('checkExist', () => {
        it('matches email exactly (lowercased) among the $or filters', async () => {
            await service.checkExist('John.Smith@Example.com');

            expect(mockEm.findOne).toHaveBeenCalledWith(
                UserEntity,
                { $or: [{ email: 'john.smith@example.com' }] },
                {}
            );
        });
    });

    describe('existByEmail', () => {
        it('matches email exactly (lowercased)', async () => {
            await service.existByEmail('John.Smith@Example.com');

            expect(mockEm.findOne).toHaveBeenCalledWith(
                UserEntity,
                { email: 'john.smith@example.com' },
                {}
            );
        });
    });

    // Task 14: createRandomFilenamePhoto used to interpolate into
    // `user.uploadPath` ("/users/{user}"), an unsubstituted `{user}`
    // template literal, and derived the extension via a raw
    // `mime.split('/')[1]` instead of a validated mime→extension map.
    describe('createRandomFilenamePhoto', () => {
        it('builds a key under user/{userId}/ with a random uuid filename', () => {
            const key = service.createRandomFilenamePhoto('user-1', {
                mime: ENUM_FILE_MIME_IMAGE.PNG,
                size: 1024,
            });

            expect(key).toMatch(
                /^user\/user-1\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/
            );
        });

        it('derives the extension from the validated mime, not a raw split', () => {
            const jpegKey = service.createRandomFilenamePhoto('user-1', {
                mime: ENUM_FILE_MIME_IMAGE.JPEG,
                size: 1024,
            });
            const jpgKey = service.createRandomFilenamePhoto('user-1', {
                mime: ENUM_FILE_MIME_IMAGE.JPG,
                size: 1024,
            });

            expect(jpegKey.endsWith('.jpg')).toBe(true);
            expect(jpgKey.endsWith('.jpg')).toBe(true);
        });

        // Fix round 1: WEBP was added to ENUM_FILE_MIME_IMAGE to match what
        // apps/app already sends for avatars.
        it('derives .webp for the WEBP mime (Fix round 1)', () => {
            const webpKey = service.createRandomFilenamePhoto('user-1', {
                mime: ENUM_FILE_MIME_IMAGE.WEBP,
                size: 1024,
            });

            expect(webpKey.endsWith('.webp')).toBe(true);
        });

        it('generates a different key on every call (random, not Date.now())', () => {
            const keyA = service.createRandomFilenamePhoto('user-1', {
                mime: ENUM_FILE_MIME_IMAGE.PNG,
                size: 1024,
            });
            const keyB = service.createRandomFilenamePhoto('user-1', {
                mime: ENUM_FILE_MIME_IMAGE.PNG,
                size: 1024,
            });

            expect(keyA).not.toEqual(keyB);
        });
    });

    // Fix round 1 (Task 18): reset-password's `reset()` controller action
    // saves the new password via this method. Pinning that it also clears
    // passwordAttempt, so a user locked out by repeated wrong-password
    // guesses can still recover by resetting their password instead of
    // being stuck forever (loginWithCredential now refuses a locked account
    // outright, whatever the password — reset is the only way out).
    describe('updatePassword', () => {
        it('resets passwordAttempt to 0 so a locked account can recover via reset-password', async () => {
            const user = {
                id: 'user-1',
                passwordAttempt: 5,
            } as any;

            const result = await service.updatePassword(user, {
                passwordHash: 'new-hash',
                passwordExpired: new Date('2099-01-01'),
                passwordCreated: new Date('2026-01-01'),
                salt: 'new-salt',
            });

            expect(result.passwordAttempt).toBe(0);
            expect(mockEm.persistAndFlush).toHaveBeenCalledWith(user);
        });
    });

    // Fix round 1 (Task 18): loginWithCredential calls this after a
    // successful password check to upgrade a hash that was created at a
    // lower bcrypt cost. Unlike updatePassword, this is not a real password
    // change, so passwordExpired/passwordCreated/passwordAttempt must be
    // left untouched.
    describe('rehashPassword', () => {
        it('updates password and salt without touching expiry or the attempt counter', async () => {
            const user = {
                id: 'user-1',
                password: 'old-hash',
                salt: 'old-salt',
                passwordExpired: new Date('2099-01-01'),
                passwordAttempt: 3,
            } as any;

            const result = await service.rehashPassword(user, {
                passwordHash: 'new-hash-at-cost-12',
                salt: 'new-salt',
            });

            expect(result.password).toBe('new-hash-at-cost-12');
            expect(result.salt).toBe('new-salt');
            expect(result.passwordExpired).toEqual(new Date('2099-01-01'));
            expect(result.passwordAttempt).toBe(3);
            expect(mockEm.persistAndFlush).toHaveBeenCalledWith(user);
        });
    });
});

// Consent record (GDPR Art 7, Decree 13/2023 Art 11): a public sign-up stores
// when the user accepted the Terms and Privacy Policy, and which version.
describe('UserService.signUp - terms acceptance', () => {
    const acceptedAt = new Date('2026-10-08T13:00:00.000Z');
    const em = {
        create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
            ...data,
        })),
        getReference: jest.fn((_entity: unknown, id: string) => ({ id })),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
    };

    const service = new UserService(
        {} as any,
        em as any,
        { create: jest.fn(() => acceptedAt) } as any,
        { get: jest.fn() } as any,
        {} as any,
        { generateUserAvatar: jest.fn(() => 'avatar-url') } as any
    );

    const signUp = () =>
        service.signUp(
            'role-1',
            {
                email: 'New@User.com',
                name: 'New User',
                country: 'country-1',
                password: 'Passw0rd!',
                acceptTerms: true,
            },
            {
                passwordHash: 'hash',
                passwordExpired: new Date('2099-01-01'),
                passwordCreated: new Date('2026-01-01'),
                salt: 'salt',
            }
        );

    it('stores termsAcceptedAt and the current termsVersion', async () => {
        const user = await signUp();

        expect(user.termsAcceptedAt).toBe(acceptedAt);
        expect(user.termsVersion).toBe(USER_TERMS_VERSION);
    });

    it('does not copy the acceptTerms request flag onto the entity', async () => {
        const user = await signUp();

        expect(user).not.toHaveProperty('acceptTerms');
    });

    // An operator creating the account (the user:create command) is not the
    // user agreeing: no consent is recorded until the user accepts.
    it('records no acceptance when the caller does not pass acceptTerms', async () => {
        const user = await service.signUp(
            'role-1',
            {
                email: 'ops@user.com',
                name: 'Ops',
                country: 'country-1',
                password: 'Passw0rd!',
            },
            {
                passwordHash: 'hash',
                passwordExpired: new Date('2099-01-01'),
                passwordCreated: new Date('2026-01-01'),
                salt: 'salt',
            }
        );

        expect(user.termsAcceptedAt).toBeUndefined();
        expect(user.termsVersion).toBeUndefined();
    });
});

describe('UserService.updateNotifications', () => {
    it('stores the choice on the user', async () => {
        const persistAndFlush = jest.fn();
        const service = Object.create(UserService.prototype);
        service.em = { persistAndFlush };
        const user = { id: 'u-1', handoffEmails: true } as any;

        await service.updateNotifications(user, { handoffEmails: false });

        expect(user.handoffEmails).toBe(false);
        expect(persistAndFlush).toHaveBeenCalledWith(user);
    });
});

// Users created before consent was recorded, or who accepted an older
// version, are asked again after login.
describe('UserService.acceptTerms', () => {
    it('records the current version and time', async () => {
        const acceptedAt = new Date('2026-10-09T08:00:00.000Z');
        const persistAndFlush = jest.fn();
        const service = Object.create(UserService.prototype);
        service.em = { persistAndFlush };
        service.helperDateService = { create: () => acceptedAt };
        const user = { id: 'u-1' } as any;

        await service.acceptTerms(user);

        expect(user.termsAcceptedAt).toBe(acceptedAt);
        expect(user.termsVersion).toBe(USER_TERMS_VERSION);
        expect(persistAndFlush).toHaveBeenCalledWith(user);
    });
});

describe('UserService.mapProfile termsAcceptanceRequired', () => {
    // Off while the documents are drafts: nobody is asked to accept.
    it('asks no one while the prompt is switched off', () => {
        expect(USER_TERMS_PROMPT_ENABLED).toBe(false);
        const mapped = Object.assign(Object.create(UserService.prototype), {
            termsPromptEnabled: USER_TERMS_PROMPT_ENABLED,
        }).mapProfile({ id: 'u-1' });
        expect(mapped.termsAcceptanceRequired).toBe(false);
    });

    it.each([
        [undefined, true],
        ['2020-01-01', true],
        [USER_TERMS_VERSION, false],
    ])(
        'with the prompt on, termsVersion %s -> %s',
        (termsVersion, expected) => {
            const enabled = Object.assign(
                Object.create(UserService.prototype),
                {
                    termsPromptEnabled: true,
                }
            );
            const mapped = enabled.mapProfile({ id: 'u-1', termsVersion });
            expect(mapped.termsAcceptanceRequired).toBe(expected);
        }
    );
});
