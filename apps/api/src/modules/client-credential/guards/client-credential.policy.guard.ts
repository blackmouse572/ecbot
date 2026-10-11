import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import { WorkspaceMemberService } from 'src/modules/workspace/services/workspace.member.service';
import { assertWorkspaceMemberPolicy } from 'src/modules/workspace/utils/workspace-policy.util';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../constants/client-credential.constant';

// Runs after ClientCredentialGuard. A credential can do at most what the
// member who created it can do in the workspace right now: the owner can do
// everything, anyone else needs an active membership whose roles grant the
// route's abilities. Checked on every call, so a role change or removing the
// member applies at once.
@Injectable()
export class ClientCredentialPolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly roleService: RoleService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __workspace, __clientCredential } = context
            .switchToHttp()
            .getRequest<IRequestApp>();

        const creatorId = __clientCredential?.createdBy?.id;
        if (!creatorId) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
                message: 'policy.error.roleForbidden',
                _error: 'Client credential has no creator',
            });
        }

        if (__workspace.owner.id === creatorId) {
            return true;
        }

        await assertWorkspaceMemberPolicy(
            {
                workspaceMemberService: this.workspaceMemberService,
                roleService: this.roleService,
                policyAbilityFactory: this.policyAbilityFactory,
            },
            __workspace.id,
            creatorId,
            {
                abilities: this.reflector.get<IPolicyAbility[]>(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    context.getHandler()
                ),
            }
        );

        return true;
    }
}
