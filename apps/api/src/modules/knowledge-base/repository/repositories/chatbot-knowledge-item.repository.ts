import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ChatbotKnowledgeItemEntity } from '../entities/chatbot-knowledge-item.entity';

@Injectable()
export class ChatbotKnowledgeItemRepository extends DatabaseRepository<ChatbotKnowledgeItemEntity> {
    constructor(em: EntityManager) {
        super(em, ChatbotKnowledgeItemEntity);
    }

    async findByChatbot(chatbotId: string) {
        return this.find(
            { chatbot: chatbotId, isActive: true, deletedAt: null },
            {
                populate: ['chatbot', 'knowledgeItem'],
                orderBy: { priority: 'DESC', createdAt: 'DESC' },
            }
        );
    }

    async findByKnowledgeItem(itemId: string) {
        return this.find(
            { knowledgeItem: itemId, isActive: true, deletedAt: null },
            {
                populate: ['chatbot', 'knowledgeItem'],
            }
        );
    }

    async findByChatbotAndItem(chatbotId: string, itemId: string) {
        return this.findOne(
            { chatbot: chatbotId, knowledgeItem: itemId, deletedAt: null },
            { populate: ['chatbot', 'knowledgeItem'] }
        );
    }

    async countByChatbot(chatbotId: string) {
        return this.em.count(ChatbotKnowledgeItemEntity, {
            chatbot: chatbotId,
            isActive: true,
            deletedAt: null,
        });
    }
}
