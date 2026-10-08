// Global setup stubs UserService; this spec needs the real one.
jest.mock('@app/modules/user/services/user.service', () =>
    jest.requireActual('@app/modules/user/services/user.service')
);
const { UserService } = jest.requireActual<{
    UserService: typeof import('@app/modules/user/services/user.service').UserService;
}>('@app/modules/user/services/user.service');

// Account deletion keeps the row (audit FKs point at it) but must not keep
// anything that identifies the person.
describe('UserService.anonymize', () => {
    const userRepository = { updateEntity: jest.fn() };
    const helperAvatarService = {
        generateUserAvatar: jest.fn((seed: string) => `avatar:${seed}`),
    };
    const configService = { get: jest.fn() };
    let service: InstanceType<typeof UserService>;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UserService(
            userRepository as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            helperAvatarService as any
        );
    });

    it('overwrites every personal field with a non-identifying value', async () => {
        const session = { tx: true };

        await service.anonymize({ id: 'u-1' } as any, {
            em: session as any,
            actionBy: 'u-1',
        });

        expect(userRepository.updateEntity).toHaveBeenCalledWith(
            { id: 'u-1' },
            {
                email: 'deleted+u-1@invalid',
                name: 'Deleted user',
                username: null,
                mobileNumber: null,
                photo: null,
                avatar: 'avatar:u-1',
                gender: null,
            },
            { em: session, actionBy: 'u-1' }
        );
    });

    it('builds the avatar from the id, not the old email', async () => {
        await service.anonymize({ id: 'u-2', email: 'a@b.co' } as any);

        expect(helperAvatarService.generateUserAvatar).toHaveBeenCalledWith(
            'u-2'
        );
    });
});
