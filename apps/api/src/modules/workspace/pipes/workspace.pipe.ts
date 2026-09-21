import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { IWorkspaceOwnerService } from '../interfaces/workspace.owner.service.interface';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';

@Injectable()
export class WorkspaceParsePipe implements PipeTransform {
    constructor(private readonly workspaceService: IWorkspaceOwnerService) {}

    async transform(value: string): Promise<WorkspaceEntity> {
        const workspace: WorkspaceEntity =
            await this.workspaceService.findOneByIdOrSlug(value);

        if (!workspace) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }

        return workspace;
    }
}
