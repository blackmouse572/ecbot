import { ExecutionContext } from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '@app/modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceOwnerGuard } from '@app/modules/workspace/guards/workspace.owner.guard';
import type { WorkspaceMemberService } from '@app/modules/workspace/services/workspace.member.service';

jest.mock('@app/modules/workspace/services/workspace.member.service', () => ({
    WorkspaceMemberService: class {},
}));

function contextFor(userId: string) {
    const request = {
        __user: { id: userId },
        __workspace: { id: 'ws-1', owner: { id: 'owner-1' } },
        params: { workspace: 'shop-a' },
    };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
}

function setup(isMember: boolean) {
    const isUserMemberOfWorkspace = jest.fn().mockResolvedValue(isMember);
    const guard = new WorkspaceOwnerGuard({
        isUserMemberOfWorkspace,
    } as unknown as WorkspaceMemberService);
    return { guard, isUserMemberOfWorkspace };
}

describe('WorkspaceOwnerGuard', () => {
    it('lets the owner in without a membership query', async () => {
        const { guard, isUserMemberOfWorkspace } = setup(false);

        await expect(guard.canActivate(contextFor('owner-1'))).resolves.toBe(
            true
        );
        expect(isUserMemberOfWorkspace).not.toHaveBeenCalled();
    });

    it('tells a member the action needs the owner (400 5208)', async () => {
        const { guard } = setup(true);

        await expect(
            guard.canActivate(contextFor('member-1'))
        ).rejects.toMatchObject({
            status: 400,
            response: {
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
            },
        });
    });

    // QA gate D11: same 404 as a missing workspace.
    it('answers a stranger 404 5200', async () => {
        const { guard } = setup(false);

        await expect(
            guard.canActivate(contextFor('stranger'))
        ).rejects.toMatchObject({
            status: 404,
            response: {
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
            },
        });
    });
});
