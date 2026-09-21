import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    WORKSPACE_POLICY_ABILITY_META_KEY,
    WORKSPACE_POLICY_ROLE_META_KEY,
} from '../constants/workspace.constant';
import { WorkspaceMemberService } from '../services/workspace.member.service';

@Injectable()
export class WorkspacePolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly roleService: RoleService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __user, __workspace, user, params } = context
            .switchToHttp()
            .getRequest<IRequestApp>();

        const { workspaceId, workspace: _workspace, workspaceSlug } = params;
        const workspaceIdOrSlug = workspaceId || workspaceSlug || _workspace;

        if (!workspaceIdOrSlug) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MISSING_INFO,
                message: 'auth.error.missingWorkspace',
                _error: 'workspaceId is missing in the request',
            });
        }

        if (!__user || !user) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MISSING_INFO,
                message: 'auth.error.missingUser',
                _error: 'User is missing in the request',
            });
        }

        // Check if user is super admin - bypass all checks
        if (user.type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        }

        // Check if user is workspace owner - bypass workspace-specific checks
        const isWorkspaceOwner = __workspace.owner.id === __user.id;
        if (isWorkspaceOwner) {
            return true;
        }

        // Get required abilities and roles from metadata
        const requiredAbilities = this.reflector.get<IPolicyAbility[]>(
            WORKSPACE_POLICY_ABILITY_META_KEY,
            context.getHandler()
        );

        const requiredRoles = this.reflector.get<ENUM_POLICY_ROLE_TYPE[]>(
            WORKSPACE_POLICY_ROLE_META_KEY,
            context.getHandler()
        );

        // Get user's workspace roles
        const userRoleIds =
            await this.workspaceMemberService.getMemberWorkspaceRoles(
                __workspace.id,
                __user.id
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
                this.roleService.findOneById(roleEntity.id)
            )
        );

        const validRoles = userRoles.filter(role => role !== null);

        if (validRoles.length === 0) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
                message: 'policy.error.roleForbidden',
                _error: 'User has no valid roles in this workspace',
            });
        }

        // Check role-based requirements
        if (requiredRoles && requiredRoles.length > 0) {
            const hasRequiredRole = validRoles.some(role =>
                requiredRoles.includes(role.type as ENUM_POLICY_ROLE_TYPE)
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
        if (requiredAbilities && requiredAbilities.length > 0) {
            // Collect all permissions from user's workspace roles
            const allPermissions = validRoles.reduce((permissions, role) => {
                return permissions.concat(role.permissions);
            }, []);

            // Use PolicyAbilityFactory to check permissions
            const userAbilities =
                this.policyAbilityFactory.createForUser(allPermissions);
            const policyHandler = this.policyAbilityFactory.handlerAbilities(
                userAbilities,
                requiredAbilities
            );

            if (!policyHandler) {
                throw new ForbiddenException({
                    statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                    message: 'policy.error.abilityForbidden',
                    _error: 'User does not have required permissions',
                });
            }
        }

        return true;
    }
}
