import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';

@Injectable()
export class WorkspaceOwnerGuard implements CanActivate {
    constructor() {}

    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
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
        if (!isUserOwner) {
            throw new BadRequestException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                message: 'workspace.error.memberNotFound',
                _error: `User is not the owner of workspace ${workspaceId}`,
            });
        }

        return true;
    }
}
