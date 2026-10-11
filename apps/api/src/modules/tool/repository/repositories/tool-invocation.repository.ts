import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository, raw } from '@mikro-orm/postgresql';
import { ToolInvocationEntity } from 'src/modules/tool/repository/entities/tool-invocation.entity';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';

@Injectable()
export class ToolInvocationRepository extends EntityRepository<ToolInvocationEntity> {
    constructor(em: EntityManager) {
        super(em, ToolInvocationEntity);
    }

    async findRecentByChatbotId(
        chatbotId: string,
        limit = 100
    ): Promise<ToolInvocationEntity[]> {
        return this.find(
            { chatbot: { id: chatbotId } },
            { orderBy: { createdAt: 'desc' }, limit, populate: ['tool'] }
        );
    }

    /** Invocation counts for one tool since a date, keyed by status. */
    async countByStatus(
        toolId: string,
        since: Date
    ): Promise<Record<ENUM_TOOL_INVOCATION_STATUS, number>> {
        const rows = await this.createQueryBuilder('i')
            .select(['i.status', raw('count(*) as count')])
            .where({ tool: toolId, createdAt: { $gte: since } })
            .groupBy('i.status')
            .execute<
                {
                    status: ENUM_TOOL_INVOCATION_STATUS;
                    count: string | number;
                }[]
            >('all');
        const counts = { SUCCESS: 0, ERROR: 0, TIMEOUT: 0 };
        for (const row of rows) counts[row.status] = Number(row.count);
        return counts;
    }

    async findLastInvokedAt(toolId: string): Promise<Date | null> {
        const last = await this.findOne(
            { tool: { id: toolId } },
            { orderBy: { createdAt: 'desc' }, fields: ['createdAt'] }
        );
        return last?.createdAt ?? null;
    }
}
