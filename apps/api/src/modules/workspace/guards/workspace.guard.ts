import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceOwnerService } from '../services/workspace.owner.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
    constructor(private readonly workspaceService: WorkspaceOwnerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const { params } = request;
        const { workspaceId, workspace: _workspace, workspaceSlug } = params;
        const workspaceIdOrSlug = workspaceId || workspaceSlug || _workspace;

        if (!workspaceIdOrSlug) {
            throw new BadRequestException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.missingWorkspaceId',
                _error: 'User or workspaceId is missing in the request param',
            });
        }

        const workspace = await this.workspaceService.findOneByIdOrSlug(
            workspaceIdOrSlug as string
        );

        if (!workspace) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.memberNotFound',
                _error: `User is not a member of workspace ${workspaceIdOrSlug}`,
            });
        }

        request.__workspace = workspace as any;
        return true;
    }
}
