import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { ENUM_FILE_MIME_IMAGE } from '@app/common/file/enums/file.enum';

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
});
