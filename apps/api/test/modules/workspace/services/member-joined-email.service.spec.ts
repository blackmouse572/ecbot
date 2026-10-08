import { MemberJoinedEmailService } from '@app/modules/workspace/services/member-joined-email.service';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';

describe('MemberJoinedEmailService.send', () => {
    const enqueue = jest.fn();
    const findWorkspace = jest.fn();
    const findUser = jest.fn();
    const cls = { get: jest.fn() };
    const service = new MemberJoinedEmailService(
        { findOneById: findWorkspace } as any,
        { findOneById: findUser } as any,
        { enqueue } as any,
        cls as any
    );
    const owner = { id: 'owner', email: 'owner@b.com', name: 'Owner' };

    beforeEach(() => {
        jest.clearAllMocks();
        enqueue.mockResolvedValue(undefined);
        findWorkspace.mockResolvedValue({
            id: 'ws-1',
            name: 'Kunmart',
            slug: 'kunmart',
            owner,
        });
        findUser.mockResolvedValue({
            id: 'linh',
            name: 'Tran Linh',
            email: 'linh@b.com',
        });
        cls.get.mockReturnValue({ __language: 'vi' });
    });

    it('emails the owner who joined, in the language of the request', async () => {
        await service.send('ws-1', 'linh');

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.MEMBER_JOINED,
            {
                send: { email: 'owner@b.com', name: 'Owner' },
                data: {
                    memberName: 'Tran Linh',
                    memberEmail: 'linh@b.com',
                    workspaceName: 'Kunmart',
                    membersUrl: '/kunmart/settings/members',
                    language: 'vi',
                },
            },
            { taskName: expect.stringMatching(/^MEMBER_JOINED-ws-1-linh-/) }
        );
    });

    it('does not email owners about themselves', async () => {
        findUser.mockResolvedValue(owner);

        await service.send('ws-1', 'owner');

        expect(enqueue).not.toHaveBeenCalled();
    });

    it('never throws: a failed email must not undo the join', async () => {
        findWorkspace.mockRejectedValue(new Error('db down'));

        await expect(service.send('ws-1', 'linh')).resolves.toBeUndefined();
    });
});
