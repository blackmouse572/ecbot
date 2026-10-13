import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    WORKSPACE_POLICY_ABILITY_META_KEY,
    WORKSPACE_POLICY_ROLE_META_KEY,
} from '../constants/workspace.constant';
import { WorkspaceMemberService } from '../services/workspace.member.service';
import { assertWorkspaceMemberPolicy } from '../utils/workspace-policy.util';

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

        await assertWorkspaceMemberPolicy(
            {
                workspaceMemberService: this.workspaceMemberService,
                roleService: this.roleService,
                policyAbilityFactory: this.policyAbilityFactory,
            },
            __workspace.id,
            __user.id,
            { abilities: requiredAbilities, roles: requiredRoles }
        );

        return true;
    }
}
