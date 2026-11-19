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

    /** Live agents with an active link to each item, keyed by item id. */
    async countChatbotsByItems(
        itemIds: string[]
    ): Promise<Map<string, number>> {
        if (itemIds.length === 0) return new Map();

        const rows: { id: string; chatbot_count: string }[] = await this.em
            .getConnection()
            .execute(
                `
                SELECT link.knowledge_item_id AS id,
                       COUNT(DISTINCT link.chatbot_id) AS chatbot_count
                FROM chatbot_knowledge_items link
                JOIN chatbots ON chatbots.id = link.chatbot_id
                WHERE link.knowledge_item_id IN (?)
                  AND link.is_active
                  AND link.deleted_at IS NULL
                  AND chatbots.deleted_at IS NULL
                GROUP BY link.knowledge_item_id
                `,
                [itemIds]
            );

        return new Map(rows.map(row => [row.id, Number(row.chatbot_count)]));
    }

    async countByChatbot(chatbotId: string) {
        return this.em.count(ChatbotKnowledgeItemEntity, {
            chatbot: chatbotId,
            isActive: true,
            deletedAt: null,
        });
    }
}
