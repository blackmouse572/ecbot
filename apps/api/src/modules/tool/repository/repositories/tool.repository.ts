import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { DatabaseRepository } from '@app/common/database/bases/database.repository';

@Injectable()
export class ToolRepository extends DatabaseRepository<ToolEntity> {
    constructor(em: EntityManager) {
        super(em, ToolEntity);
    }

    async findByWorkspaceId(workspaceId: string): Promise<ToolEntity[]> {
        return this.find({ workspace: { id: workspaceId }, deleted: false });
    }

    async findOneInWorkspace(
        toolId: string,
        workspaceId: string
    ): Promise<ToolEntity | null> {
        return this.findOne(
            { id: toolId, workspace: { id: workspaceId }, deleted: false },
            { populate: ['createdBy', 'updatedBy'] as any }
        );
    }

    async findAllPaginated(
        find: Record<string, any>,
        options: {
            limit?: number;
            offset?: number;
            order?: IPaginationOrder;
        } = {}
    ): Promise<ToolEntity[]> {
        const where = { ...find, deleted: false };
        return this.find(where, {
            limit: options.limit,
            offset: options.offset,
            orderBy: (options.order as any) ?? { createdAt: 'DESC' },
        });
    }

    async countAll(find: Record<string, any>): Promise<number> {
        return this.getTotal({ ...find, deleted: false });
    }

    // Tools needing operator attention: the connection is broken and requires
    // action (re-auth / expired / revoked). ACTIVE tools are healthy.
    async countNeedingAttentionByWorkspace(
        workspaceId: string
    ): Promise<number> {
        return this.countAll({
            workspace: { id: workspaceId },
            status: {
                $in: [
                    ENUM_TOOL_STATUS.NEEDS_REAUTH,
                    ENUM_TOOL_STATUS.EXPIRED,
                    ENUM_TOOL_STATUS.REVOKED,
                ],
            },
        });
    }
}
