import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WORKSPACE_EXCLUDE_OWNER_META_KEY } from '../constants/workspace.constant';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceMemberService } from '../services/workspace.member.service';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberService: WorkspaceMemberService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const excludedOwner =
            this.reflector.get<boolean>(
                WORKSPACE_EXCLUDE_OWNER_META_KEY,
                context.getHandler()
            ) || false;

        const { __user, __workspace, params } = context
            .switchToHttp()
            .getRequest<IRequestApp>();
        const { workspaceId, workspace: _workspace, workspaceSlug } = params;
        const workspaceIdOrSlug = workspaceId || workspaceSlug || _workspace;
        if (!__user || !workspaceIdOrSlug) {
            throw new BadRequestException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'auth.error.accessTokenUnauthorized',
                _error: 'User or workspaceId is missing in the request',
            });
        }

        const isUserInMembers =
            await this.workspaceMemberService.isUserMemberOfWorkspace(
                __workspace.id,
                __user.id
            );
        const isUserOwner = __workspace.owner.id === __user.id;
        if (excludedOwner) {
            // If owner is excluded, user must be a member and not the owner
            if (!isUserInMembers || isUserOwner) {
                throw new BadRequestException({
                    statusCode:
                        ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                    message: 'workspace.error.memberNotFound',
                    _error: `User is not eligible for this workspace operation`,
                });
            }
        } else {
            // Default: user can be either a member or the owner
            if (!isUserInMembers && !isUserOwner) {
                throw new BadRequestException({
                    statusCode:
                        ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                    message: 'workspace.error.memberNotFound',
                    _error: `User is not a member of workspace ${workspaceIdOrSlug}`,
                });
            }
        }

        return true;
    }
}
