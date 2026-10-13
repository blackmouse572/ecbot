import { ForbiddenException } from '@nestjs/common';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '../../../src/modules/policy/factories/policy.factory';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../../src/modules/workspace/constants/workspace.constant';

// A client credential can do at most what the member who created it can do
// in the workspace right now: same roles and abilities as the workspace
// routes, checked on every call, so a role change or removal applies at once.

const readCustomers = [
    {
        action: [ENUM_POLICY_ACTION.READ],
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    },
];

function build({
    createdBy = { id: 'creator-1' } as { id: string } | null,
    ownerId = 'owner-1',
    roleIds = [{ id: 'role-1' }],
    role = {
        isActive: true,
        permissions: WORKSPACE_DEFAULT_MEMBER_ROLES[0].permissions,
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
    } as Record<string, unknown> | null,
} = {}) {
    const reflector = {
        get: jest.fn((key: string) =>
            key === CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY
                ? readCustomers
                : undefined
        ),
    };
    const workspaceMemberService = {
        getMemberWorkspaceRoles: jest.fn().mockResolvedValue(roleIds),
    };
    const roleService = { findOneById: jest.fn().mockResolvedValue(role) };
    const guard = new ClientCredentialPolicyGuard(
        reflector as any,
        workspaceMemberService as any,
        roleService as any,
        new PolicyAbilityFactory()
    );
    const context = {
        getHandler: jest.fn(),
        switchToHttp: () => ({
            getRequest: () => ({
                __workspace: { id: 'workspace-1', owner: { id: ownerId } },
                __clientCredential: { createdBy },
            }),
        }),
    } as any;

    return {
        activate: () => guard.canActivate(context),
        workspaceMemberService,
    };
}

describe('ClientCredentialPolicyGuard', () => {
    it('lets the workspace owner through without a role lookup', async () => {
        const { activate, workspaceMemberService } = build({
            ownerId: 'creator-1',
        });

        await expect(activate()).resolves.toBe(true);
        expect(
            workspaceMemberService.getMemberWorkspaceRoles
        ).not.toHaveBeenCalled();
    });

    it("allows a member whose role grants the route's ability", async () => {
        const { activate, workspaceMemberService } = build();

        await expect(activate()).resolves.toBe(true);
        expect(
            workspaceMemberService.getMemberWorkspaceRoles
        ).toHaveBeenCalledWith('workspace-1', 'creator-1');
    });

    it("rejects a member whose role lacks the route's ability", async () => {
        const { activate } = build({
            role: {
                isActive: true,
                permissions: [],
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            },
        });

        await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the creator is no longer a member', async () => {
        const { activate } = build({ roleIds: [] });

        await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects when the creator's role is deactivated", async () => {
        const { activate } = build({
            role: {
                isActive: false,
                permissions: WORKSPACE_DEFAULT_MEMBER_ROLES[0].permissions,
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            },
        });

        await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a credential with no recorded creator', async () => {
        const { activate } = build({ createdBy: null });

        await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    });
});
