import { ForbiddenException } from '@nestjs/common';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import { WorkspaceMemberService } from '../services/workspace.member.service';

// The member check behind WorkspacePolicyGuard and ClientCredentialPolicyGuard:
// the user's active roles in the workspace must include a required role type
// and grant the required abilities. Callers decide who skips it (the owner,
// a super admin).
export async function assertWorkspaceMemberPolicy(
    deps: {
        workspaceMemberService: WorkspaceMemberService;
        roleService: RoleService;
        policyAbilityFactory: PolicyAbilityFactory;
    },
    workspaceId: string,
    userId: string,
    required: {
        abilities?: IPolicyAbility[];
        roles?: ENUM_POLICY_ROLE_TYPE[];
    }
): Promise<void> {
    // Get user's workspace roles
    const userRoleIds =
        await deps.workspaceMemberService.getMemberWorkspaceRoles(
            workspaceId,
            userId
        );

    if (!userRoleIds || userRoleIds.length === 0) {
        throw new ForbiddenException({
            statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
            message: 'policy.error.roleForbidden',
            _error: 'User has no roles in this workspace',
        });
    }

    // Get user's roles with full details
    const userRoles = await Promise.all(
        userRoleIds.map(roleEntity =>
            deps.roleService.findOneById(roleEntity.id)
        )
    );

    // Deactivated roles (isActive === false) grant nothing, even if the
    // membership row that references them is still active.
    const validRoles = userRoles.filter(
        role => role !== null && role.isActive !== false
    );

    if (validRoles.length === 0) {
        throw new ForbiddenException({
            statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
            message: 'policy.error.roleForbidden',
            _error: 'User has no valid roles in this workspace',
        });
    }

    // Check role-based requirements
    if (required.roles && required.roles.length > 0) {
        const hasRequiredRole = validRoles.some(role =>
            required.roles.includes(role.type as ENUM_POLICY_ROLE_TYPE)
        );

        if (!hasRequiredRole) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
                message: 'policy.error.roleForbidden',
                _error: 'User does not have required role type',
            });
        }
    }

    // Check ability-based requirements
    if (required.abilities && required.abilities.length > 0) {
        // Collect all permissions from user's workspace roles
        const allPermissions = validRoles.reduce((permissions, role) => {
            return permissions.concat(role.permissions);
        }, []);

        // Use PolicyAbilityFactory to check permissions
        const userAbilities =
            deps.policyAbilityFactory.createForUser(allPermissions);
        const policyHandler = deps.policyAbilityFactory.handlerAbilities(
            userAbilities,
            required.abilities
        );

        if (!policyHandler) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                message: 'policy.error.abilityForbidden',
                _error: 'User does not have required permissions',
            });
        }
    }
}
