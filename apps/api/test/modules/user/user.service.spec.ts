import { UserEntity } from '@app/modules/user/repository/entities/user.entity';

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
                case 'user.uploadPath':
                    return '/uploads';
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
});
