import {
    BadRequestException,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '@app/modules/workspace/enums/workspace.status-code.enum';
import { Reflector } from '@nestjs/core';
import { WorkspaceMemberGuard } from '@app/modules/workspace/guards/workspace.member.guard';
import type { WorkspaceMemberService } from '@app/modules/workspace/services/workspace.member.service';

jest.mock('@app/modules/workspace/services/workspace.member.service', () => ({
    WorkspaceMemberService: class {},
}));

function contextFor(userId: string, ownerId = 'owner-1') {
    const request = {
        __user: { id: userId },
        __workspace: { id: 'ws-1', owner: { id: ownerId } },
        params: { workspace: 'ws-1' },
    };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ({}),
    } as unknown as ExecutionContext;
}

function setup(isMember: boolean, excludedOwner = false) {
    const isUserMemberOfWorkspace = jest.fn().mockResolvedValue(isMember);
    const guard = new WorkspaceMemberGuard(
        { get: () => excludedOwner } as unknown as Reflector,
        { isUserMemberOfWorkspace } as unknown as WorkspaceMemberService
    );
    return { guard, isUserMemberOfWorkspace };
}

describe('WorkspaceMemberGuard', () => {
    it('lets the owner in without a membership query', async () => {
        const { guard, isUserMemberOfWorkspace } = setup(false);

        await expect(guard.canActivate(contextFor('owner-1'))).resolves.toBe(
            true
        );
        expect(isUserMemberOfWorkspace).not.toHaveBeenCalled();
    });

    it('checks a member once, then serves it from cache', async () => {
        const { guard, isUserMemberOfWorkspace } = setup(true);

        for (let i = 0; i < 3; i++) {
            await expect(
                guard.canActivate(contextFor('member-1'))
            ).resolves.toBe(true);
        }
        expect(isUserMemberOfWorkspace).toHaveBeenCalledTimes(1);
    });

    it('does not cache a stranger', async () => {
        const { guard, isUserMemberOfWorkspace } = setup(false);

        for (let i = 0; i < 2; i++) {
            await expect(
                guard.canActivate(contextFor('stranger'))
            ).rejects.toThrow(NotFoundException);
        }
        expect(isUserMemberOfWorkspace).toHaveBeenCalledTimes(2);
    });

    it('still keeps the owner out of member-only routes', async () => {
        const { guard } = setup(true, true);

        await expect(guard.canActivate(contextFor('owner-1'))).rejects.toThrow(
            BadRequestException
        );
    });

    // QA gate D11: a stranger gets the same 404 5200 as a slug that does not
    // exist, so the answer never confirms a workspace exists.
    it.each([false, true])(
        'answers a stranger 404 5200 (member-only route: %s)',
        async excludedOwner => {
            const { guard } = setup(false, excludedOwner);

            await expect(
                guard.canActivate(contextFor('stranger'))
            ).rejects.toMatchObject({
                status: 404,
                response: {
                    statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                },
            });
        }
    );
});
