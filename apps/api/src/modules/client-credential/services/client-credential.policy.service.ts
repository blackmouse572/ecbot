import { Injectable } from '@nestjs/common';
import { ENUM_POLICY_ACTION } from 'src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT } from 'src/modules/role/constants/role.list.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { ClientCredentialEntity } from 'src/modules/client-credential/repository/entities/client-credential.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { WorkspaceMemberService } from 'src/modules/workspace/services/workspace.member.service';
import { findActiveWorkspaceRoles } from 'src/modules/workspace/utils/workspace-policy.util';

@Injectable()
export class ClientCredentialPolicyService {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly roleService: RoleService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    // What a key may do, decided as ClientCredentialPolicyGuard decides it:
    // the owner's key everything, a member's key what their active roles
    // allow, a key with no creator nothing. Every allowed action is listed
    // (manage expanded), so a caller needs no policy rules of its own.
    async findAbilities(
        credential: ClientCredentialEntity,
        workspace: WorkspaceEntity
    ): Promise<IPolicyAbility[]> {
        const creatorId = credential.createdBy?.id;
        if (!creatorId) return [];

        const actions = Object.values(ENUM_POLICY_ACTION);
        if (workspace.owner.id === creatorId) {
            return ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT.map(subject => ({
                subject,
                action: actions,
            }));
        }

        const roles = await findActiveWorkspaceRoles(
            {
                workspaceMemberService: this.workspaceMemberService,
                roleService: this.roleService,
            },
            workspace.id,
            creatorId
        );
        const ability = this.policyAbilityFactory.createForUser(
            roles.flatMap(role => role.permissions)
        );

        return ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT.map(subject => ({
            subject,
            action: actions.filter(action => ability.can(action, subject)),
        })).filter(({ action }) => action.length > 0);
    }
}
