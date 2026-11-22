import { WorkspaceAbilityService } from '@app/modules/workspace/services/workspace-ability.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@app/modules/policy/factories/policy.factory';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';

// The same answer WorkspacePolicyGuard gives, for one ability checked inside
// a handler: super admin and owner may do anything, a member what their
// active roles grant.
describe('WorkspaceAbilityService', () => {
    const workspace = {
        id: 'ws-1',
        owner: { id: 'owner-1' },
    } as WorkspaceEntity;
    const readCustomer = {
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    };
    const member = { id: 'user-1', type: ENUM_POLICY_ROLE_TYPE.USER };

    const build = (permissions: { subject: string; action: string }[]) => {
        const workspaceMemberService = {
            getMemberWorkspaceRoles: jest
                .fn()
                .mockResolvedValue([{ id: 'r1' }]),
        };
        const roleService = {
            findOneById: jest
                .fn()
                .mockResolvedValue({ id: 'r1', isActive: true, permissions }),
        };
        return {
            service: new WorkspaceAbilityService(
                workspaceMemberService as any,
                roleService as any,
                new PolicyAbilityFactory()
            ),
            workspaceMemberService,
        };
    };

    it('lets a member whose role reads customers', async () => {
        const { service } = build([
            {
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                action: ENUM_POLICY_ACTION.READ,
            },
        ]);
        await expect(
            service.can(workspace, member, readCustomer)
        ).resolves.toBe(true);
    });

    it('refuses a member whose roles do not read customers', async () => {
        const { service } = build([
            {
                subject: ENUM_POLICY_SUBJECT.CHATBOT,
                action: ENUM_POLICY_ACTION.READ,
            },
        ]);
        await expect(
            service.can(workspace, member, readCustomer)
        ).resolves.toBe(false);
    });

    it('lets the owner and a super admin without loading roles', async () => {
        const { service, workspaceMemberService } = build([]);
        await expect(
            service.can(
                workspace,
                { id: 'owner-1', type: ENUM_POLICY_ROLE_TYPE.USER },
                readCustomer
            )
        ).resolves.toBe(true);
        await expect(
            service.can(
                workspace,
                { id: 'x', type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN },
                readCustomer
            )
        ).resolves.toBe(true);
        expect(
            workspaceMemberService.getMemberWorkspaceRoles
        ).not.toHaveBeenCalled();
    });
});
