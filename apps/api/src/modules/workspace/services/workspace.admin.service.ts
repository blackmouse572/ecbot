import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WorkspaceAdminResponseDto } from '../dtos/response/workspace.admin.response.dto';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { WorkSpaceRepository } from '../repository/repositories/workspace.repository';

/** Read side of the admin workspace pages: every workspace, any owner. */
@Injectable()
export class WorkspaceAdminService {
    constructor(private readonly workspaceRepository: WorkSpaceRepository) {}

    async findAll(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<WorkspaceAdminResponseDto[]> {
        const workspaces = await this.workspaceRepository.find<WorkspaceEntity>(
            { deleted: false, ...find },
            { ...options, populate: ['owner'] }
        );
        return this.map(workspaces);
    }

    getTotal(find: Record<string, any>): Promise<number> {
        return this.workspaceRepository.getTotal({ deleted: false, ...find });
    }

    async findOneById(id: string): Promise<WorkspaceAdminResponseDto | null> {
        const workspace =
            await this.workspaceRepository.findOne<WorkspaceEntity>(
                { id, deleted: false },
                { populate: ['owner'] }
            );
        if (!workspace) return null;
        const [mapped] = await this.map([workspace]);
        return mapped;
    }

    private async map(
        workspaces: WorkspaceEntity[]
    ): Promise<WorkspaceAdminResponseDto[]> {
        const counts = await this.workspaceRepository.countMembersAndChatbots(
            workspaces.map(workspace => workspace.id)
        );
        return workspaces.map(workspace =>
            plainToInstance(WorkspaceAdminResponseDto, {
                id: workspace.id,
                name: workspace.name,
                avatar: workspace.avatar,
                slug: workspace.slug,
                owner: workspace.owner,
                tokenCreditBalance: workspace.tokenCreditBalance,
                createdAt: workspace.createdAt,
                updatedAt: workspace.updatedAt,
                memberCount: counts.get(workspace.id)?.memberCount ?? 0,
                chatbotCount: counts.get(workspace.id)?.chatbotCount ?? 0,
            })
        );
    }
}
