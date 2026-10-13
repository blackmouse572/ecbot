import { ClientCredentialPolicyService } from '../../../src/modules/client-credential/services/client-credential.policy.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '../../../src/modules/policy/factories/policy.factory';
import { ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT } from '../../../src/modules/role/constants/role.list.constant';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../../src/modules/workspace/constants/workspace.constant';

// Lists what a key may do, decided the same way as ClientCredentialPolicyGuard,
// so a client (the MCP server) can offer only what will succeed.

const ALL_ACTIONS = Object.values(ENUM_POLICY_ACTION);

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
    const workspaceMemberService = {
        getMemberWorkspaceRoles: jest.fn().mockResolvedValue(roleIds),
    };
    const roleService = { findOneById: jest.fn().mockResolvedValue(role) };
    const service = new ClientCredentialPolicyService(
        workspaceMemberService as any,
        roleService as any,
        new PolicyAbilityFactory()
    );

    return {
        findAbilities: () =>
            service.findAbilities(
                { createdBy } as any,
                { id: 'workspace-1', owner: { id: ownerId } } as any
            ),
        workspaceMemberService,
    };
}

describe('ClientCredentialPolicyService.findAbilities', () => {
    it('gives the owner every action on every workspace subject', async () => {
        const { findAbilities, workspaceMemberService } = build({
            ownerId: 'creator-1',
        });

        await expect(findAbilities()).resolves.toEqual(
            ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT.map(subject => ({
                subject,
                action: ALL_ACTIONS,
            }))
        );
        expect(
            workspaceMemberService.getMemberWorkspaceRoles
        ).not.toHaveBeenCalled();
    });

    it("lists only the subjects a member's role grants, manage as every action", async () => {
        const { findAbilities } = build();

        await expect(findAbilities()).resolves.toEqual([
            { subject: ENUM_POLICY_SUBJECT.CHATBOT, action: ALL_ACTIONS },
            { subject: ENUM_POLICY_SUBJECT.RAG, action: ALL_ACTIONS },
            {
                subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                action: ALL_ACTIONS,
            },
            {
                subject: ENUM_POLICY_SUBJECT.TOOL,
                action: [ENUM_POLICY_ACTION.READ],
            },
            { subject: ENUM_POLICY_SUBJECT.CUSTOMER, action: ALL_ACTIONS },
            {
                subject: ENUM_POLICY_SUBJECT.SKILL,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ]);
    });

    it('gives a read-only role read and nothing else', async () => {
        const { findAbilities } = build({
            role: {
                isActive: true,
                permissions: [
                    {
                        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                        action: [ENUM_POLICY_ACTION.READ],
                    },
                ],
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            },
        });

        await expect(findAbilities()).resolves.toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ]);
    });

    it('gives nothing once the creator is no longer a member', async () => {
        const { findAbilities } = build({ roleIds: [] });

        await expect(findAbilities()).resolves.toEqual([]);
    });

    it('gives nothing through a deactivated role', async () => {
        const { findAbilities } = build({
            role: {
                isActive: false,
                permissions: WORKSPACE_DEFAULT_MEMBER_ROLES[0].permissions,
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            },
        });

        await expect(findAbilities()).resolves.toEqual([]);
    });

    it('gives nothing to a key with no creator', async () => {
        const { findAbilities } = build({ createdBy: null });

        await expect(findAbilities()).resolves.toEqual([]);
    });
});
