import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { ToolInvocationEntity } from 'src/modules/tool/repository/entities/tool-invocation.entity';

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
}
