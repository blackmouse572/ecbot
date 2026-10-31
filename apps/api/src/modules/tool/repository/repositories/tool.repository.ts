import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { IToolkitUsage } from 'src/modules/tool/interfaces/toolkit-usage.interface';
import { DatabaseRepository } from '@app/common/database/bases/database.repository';

@Injectable()
export class ToolRepository extends DatabaseRepository<ToolEntity> {
    constructor(em: EntityManager) {
        super(em, ToolEntity);
    }

    async findByWorkspaceId(workspaceId: string): Promise<ToolEntity[]> {
        return this.find({ workspace: { id: workspaceId }, deleted: false });
    }

    async findByIdsInWorkspace(
        toolIds: string[],
        workspaceId: string
    ): Promise<ToolEntity[]> {
        if (!toolIds.length) return [];
        return this.find({
            id: { $in: toolIds },
            workspace: { id: workspaceId },
            deleted: false,
        });
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

    /** Admin lookup: any workspace, with the workspace loaded. */
    async findOneAny(toolId: string): Promise<ToolEntity | null> {
        return this.findOne(
            { id: toolId, deleted: false },
            { populate: ['workspace', 'createdBy'] as any }
        );
    }

    async findAllPaginated(
        find: Record<string, any>,
        options: {
            limit?: number;
            offset?: number;
            order?: IPaginationOrder;
            populate?: string[];
        } = {}
    ): Promise<ToolEntity[]> {
        const where = { ...find, deleted: false };
        return this.find(where, {
            limit: options.limit,
            offset: options.offset,
            orderBy: (options.order as any) ?? { createdAt: 'DESC' },
            populate: (options.populate ?? []) as any,
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

    /**
     * Live tools per marketplace toolkit: how many workspaces installed it and
     * how many tools that made. Keyed by the toolkit slug in `source`.
     */
    async countUsageByToolkit(
        provider: ENUM_MCP_PROVIDER.ECCHO | ENUM_MCP_PROVIDER.COMPOSIO
    ): Promise<Map<string, IToolkitUsage>> {
        const key =
            provider === ENUM_MCP_PROVIDER.ECCHO ? 'service' : 'toolkit';
        const rows: {
            slug: string;
            workspace_count: string;
            tool_count: string;
        }[] = await this.em.getConnection().execute(
            `
            SELECT source->>'${key}' AS slug,
                   COUNT(DISTINCT workspace_id) AS workspace_count,
                   COUNT(*) AS tool_count
            FROM tools
            WHERE deleted = false AND mcp_provider = ?
              AND source->>'${key}' IS NOT NULL
            GROUP BY 1
            `,
            [provider]
        );

        return new Map(
            rows.map(row => [
                row.slug,
                {
                    workspaceCount: Number(row.workspace_count),
                    toolCount: Number(row.tool_count),
                },
            ])
        );
    }

    /** Latest live tools installed from one Ecbot built-in toolkit. */
    async findByEcchoToolkit(
        slug: string,
        limit: number
    ): Promise<ToolEntity[]> {
        const rows: { id: string }[] = await this.em.getConnection().execute(
            `
            SELECT id FROM tools
            WHERE deleted = false AND mcp_provider = ?
              AND source->>'service' = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [ENUM_MCP_PROVIDER.ECCHO, slug, limit]
        );
        if (!rows.length) return [];
        return this.find(
            { id: { $in: rows.map(r => r.id) } },
            { populate: ['workspace'] as any, orderBy: { createdAt: 'DESC' } }
        );
    }
}
