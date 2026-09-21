import { PolicyAbilityFactory } from '../../../../src/modules/policy/factories/policy.factory';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { ForbiddenException } from '@nestjs/common';
import {
    WORKSPACE_DEFAULT_MEMBER_ROLES,
    WORKSPACE_POLICY_ABILITY_META_KEY,
} from '../../../../src/modules/workspace/constants/workspace.constant';
import { WorkspacePolicyGuard } from '../../../../src/modules/workspace/guards/workspace.policy.guard';

describe('WorkspacePolicyGuard customer permissions', () => {
    const buildGuard = (permissions: unknown[]) => {
        const reflector = {
            get: jest.fn((key: string) =>
                key === WORKSPACE_POLICY_ABILITY_META_KEY
                    ? [
                          {
                              action: [ENUM_POLICY_ACTION.CREATE],
                              subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                          },
                      ]
                    : undefined
            ),
        };
        const workspaceMemberService = {
            getMemberWorkspaceRoles: jest
                .fn()
                .mockResolvedValue([{ id: 'role-member' }]),
        };
        const roleService = {
            findOneById: jest.fn().mockResolvedValue({
                permissions,
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            }),
        };
        const guard = new WorkspacePolicyGuard(
            reflector as any,
            workspaceMemberService as any,
            roleService as any,
            new PolicyAbilityFactory()
        );
        const context = {
            getHandler: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => ({
                    __user: { id: 'user-1' },
                    __workspace: {
                        id: 'workspace-1',
                        owner: { id: 'owner-1' },
                    },
                    params: { workspace: 'workspace-1' },
                    user: { type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER },
                }),
            }),
        } as any;

        return {
            canActivate: guard.canActivate(context),
            workspaceMemberService,
        };
    };

    it('allows a default workspace member to create customer tags', async () => {
        const { canActivate, workspaceMemberService } = buildGuard(
            WORKSPACE_DEFAULT_MEMBER_ROLES[0].permissions
        );

        await expect(canActivate).resolves.toBe(true);
        expect(
            workspaceMemberService.getMemberWorkspaceRoles
        ).toHaveBeenCalledWith('workspace-1', 'user-1');
    });

    it('rejects a workspace member without CUSTOMER permission', async () => {
        await expect(buildGuard([]).canActivate).rejects.toBeInstanceOf(
            ForbiddenException
        );
    });
});
