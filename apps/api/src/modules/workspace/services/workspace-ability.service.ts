import { ForbiddenException, Injectable } from '@nestjs/common';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { assertWorkspaceMemberPolicy } from '../utils/workspace-policy.util';
import { WorkspaceMemberService } from './workspace.member.service';

/**
 * Whether the user holds an ability in the workspace, decided as
 * WorkspacePolicyGuard decides it: a super admin and the owner may do
 * anything, a member what their active roles grant. For a check that
 * depends on the request, such as an optional filter on another subject.
 */
@Injectable()
export class WorkspaceAbilityService {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly roleService: RoleService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async can(
        workspace: WorkspaceEntity,
        user: { id: string; type: ENUM_POLICY_ROLE_TYPE },
        ability: IPolicyAbility
    ): Promise<boolean> {
        if (user.type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) return true;
        if (workspace.owner.id === user.id) return true;

        try {
            await assertWorkspaceMemberPolicy(
                {
                    workspaceMemberService: this.workspaceMemberService,
                    roleService: this.roleService,
                    policyAbilityFactory: this.policyAbilityFactory,
                },
                workspace.id,
                user.id,
                { abilities: [ability] }
            );
            return true;
        } catch (error: unknown) {
            if (error instanceof ForbiddenException) return false;
            throw error;
        }
    }
}
