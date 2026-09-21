import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_CHATBOT_STATUS } from '../../enums/chatbot.enum';
import { ChatbotEntity } from '../entities/chatbot.entity';

@Injectable()
export class ChatbotRepository extends DatabaseRepository<ChatbotEntity> {
    constructor(em: EntityManager) {
        super(em, ChatbotEntity);
    }

    async findByWorkspace(workspaceId: string): Promise<ChatbotEntity[]> {
        return this.find(
            { workspace: workspaceId },
            { populate: ['workspace', 'createdBy'] }
        );
    }

    async findActiveByWorkspace(workspaceId: string): Promise<ChatbotEntity[]> {
        return this.find(
            { workspace: workspaceId, status: ENUM_CHATBOT_STATUS.ACTIVE },
            { populate: ['workspace', 'createdBy'] }
        );
    }

    async findByName(
        name: string,
        workspaceId?: string
    ): Promise<ChatbotEntity | null> {
        const filters: any = { name };
        if (workspaceId) {
            filters.workspace = workspaceId;
        }
        return this.findOne(filters);
    }
}
