import { UserDataExportService } from '@app/modules/export/services/user-data-export.service';

// Right of access / portability (GDPR Art 15, 20): a user downloads what we
// hold about them, without secrets.
describe('UserDataExportService', () => {
    const workspaceMemberRepository = { find: jest.fn() };
    const sessionRepository = { find: jest.fn() };
    const activityRepository = { find: jest.fn() };
    let service: UserDataExportService;

    const user = {
        id: 'u-1',
        name: 'Nguyen Van A',
        username: 'vana',
        email: 'a@b.co',
        mobileNumber: { number: '909000111', country: { id: 'vn' } },
        password: 'hash',
        salt: 'salt',
        gender: 'male',
        avatar: 'https://cdn/a.png',
        status: 'active',
        signUpDate: new Date('2026-01-01T00:00:00Z'),
        signUpFrom: 'public',
        verification: { email: true, mobileNumber: false },
        createdAt: new Date('2026-01-01T00:00:00Z'),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        workspaceMemberRepository.find.mockResolvedValue([
            {
                workspace: { id: 'ws-1', name: 'Shop' },
                role: { name: 'Admin', type: 'WORKSPACE_MEMBER' },
                joinedAt: new Date('2026-02-01T00:00:00Z'),
                isActive: true,
            },
        ]);
        sessionRepository.find.mockResolvedValue([
            {
                id: 's-1',
                ip: '1.2.3.4',
                userAgent: 'Firefox',
                country: 'VN',
                status: 'ACTIVE',
                createdAt: new Date('2026-03-01T00:00:00Z'),
                expiredAt: new Date('2026-04-01T00:00:00Z'),
            },
        ]);
        activityRepository.find.mockResolvedValue([
            {
                id: 'a-1',
                action: 'update',
                subject: 'USER',
                workspace: { id: 'ws-1' },
                metadata: { id: 'u-1' },
                createdAt: new Date('2026-03-02T00:00:00Z'),
            },
        ]);
        service = new UserDataExportService(
            workspaceMemberRepository as any,
            sessionRepository as any,
            activityRepository as any
        );
    });

    it('includes profile, workspaces, sessions and activities', async () => {
        const result = await service.export(user);

        expect(Object.keys(result).sort()).toEqual(
            [
                'activities',
                'exportedAt',
                'profile',
                'sessions',
                'workspaces',
            ].sort()
        );
        expect(result.profile).toMatchObject({
            id: 'u-1',
            name: 'Nguyen Van A',
            email: 'a@b.co',
            mobileNumber: '909000111',
        });
        expect(result.workspaces).toEqual([
            {
                workspaceId: 'ws-1',
                workspaceName: 'Shop',
                roleName: 'Admin',
                roleType: 'WORKSPACE_MEMBER',
                joinedAt: new Date('2026-02-01T00:00:00Z'),
                isActive: true,
            },
        ]);
        expect(result.sessions[0]).toMatchObject({
            id: 's-1',
            ip: '1.2.3.4',
            userAgent: 'Firefox',
        });
        expect(result.activities[0]).toMatchObject({
            action: 'update',
            subject: 'USER',
            workspaceId: 'ws-1',
        });
    });

    it('only reads the caller own rows', async () => {
        await service.export(user);

        expect(workspaceMemberRepository.find.mock.calls[0][0]).toEqual({
            user: 'u-1',
        });
        expect(sessionRepository.find.mock.calls[0][0]).toEqual({
            user: 'u-1',
        });
        expect(activityRepository.find.mock.calls[0][0]).toEqual({
            user: 'u-1',
        });
    });

    it('never exports the password hash or salt', async () => {
        const json = JSON.stringify(await service.export(user));

        expect(json).not.toContain('hash');
        expect(json).not.toContain('"salt"');
    });
});
