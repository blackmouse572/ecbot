import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
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

    /** Invocation counts for one tool, keyed by status (rows live 30 days). */
    async countByStatus(
        toolId: string
    ): Promise<Record<ENUM_TOOL_INVOCATION_STATUS, number>> {
        const statuses = Object.values(ENUM_TOOL_INVOCATION_STATUS);
        const counts = await Promise.all(
            statuses.map(status => this.count({ tool: { id: toolId }, status }))
        );
        return Object.fromEntries(
            statuses.map((status, i) => [status, counts[i]])
        ) as Record<ENUM_TOOL_INVOCATION_STATUS, number>;
    }

    async findLastInvokedAt(toolId: string): Promise<Date | null> {
        const last = await this.findOne(
            { tool: { id: toolId } },
            { orderBy: { createdAt: 'desc' }, fields: ['createdAt'] }
        );
        return last?.createdAt ?? null;
    }
}
