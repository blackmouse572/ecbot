import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TtlCache } from '@app/common/utils/ttl-cache.util';
import {
    WORKSPACE_EXCLUDE_OWNER_META_KEY,
    WORKSPACE_MEMBER_CACHE_MAX_ENTRIES,
    WORKSPACE_MEMBER_CACHE_TTL_MS,
} from '../constants/workspace.constant';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceMemberService } from '../services/workspace.member.service';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    private readonly members = new TtlCache<true>(
        WORKSPACE_MEMBER_CACHE_TTL_MS,
        WORKSPACE_MEMBER_CACHE_MAX_ENTRIES
    );

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

        const isUserOwner = __workspace.owner.id === __user.id;
        // The owner passes by default, so no membership query is needed.
        if (isUserOwner && !excludedOwner) return true;

        const isUserInMembers = await this.isMember(__workspace.id, __user.id);
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

    private async isMember(
        workspaceId: string,
        userId: string
    ): Promise<boolean> {
        const key = `${workspaceId}:${userId}`;
        if (this.members.get(key)) return true;

        const isMember =
            await this.workspaceMemberService.isUserMemberOfWorkspace(
                workspaceId,
                userId
            );
        if (isMember) this.members.set(key, true);
        return isMember;
    }
}
