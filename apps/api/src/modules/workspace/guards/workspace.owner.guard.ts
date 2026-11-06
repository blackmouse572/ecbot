import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceMemberService } from '../services/workspace.member.service';
import { workspaceNotFoundException } from '../utils/workspace-not-found.util';

@Injectable()
export class WorkspaceOwnerGuard implements CanActivate {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __user, __workspace, params } = context
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

        if (!__user) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MISSING_INFO,
                message: 'auth.error.missingUser',
                _error: 'User is missing in the request',
            });
        }

        const isUserOwner = __workspace.owner.id === __user.id;

        if (isUserOwner) return true;

        // A stranger gets the same 404 as a missing workspace; only a member
        // learns that the action needs the owner.
        const isMember =
            await this.workspaceMemberService.isUserMemberOfWorkspace(
                __workspace.id,
                __user.id
            );

        if (!isMember) {
            throw workspaceNotFoundException(workspaceIdOrSlug);
        }

        throw new BadRequestException({
            statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
            message: 'workspace.error.memberNotFound',
            _error: `User is not the owner of workspace ${workspaceIdOrSlug}`,
        });
    }
}
