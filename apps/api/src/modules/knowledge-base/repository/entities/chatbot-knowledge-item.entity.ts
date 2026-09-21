import { Entity, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { KnowledgeItemEntity } from './knowledge-item.entity';

@Entity({ tableName: 'chatbot_knowledge_items' })
export class ChatbotKnowledgeItemEntity extends DatabaseEntityBase {
    @ManyToOne(() => ChatbotEntity)
    chatbot: ChatbotEntity;

    @ManyToOne(() => KnowledgeItemEntity)
    knowledgeItem: KnowledgeItemEntity;

    @Property({ default: true })
    isActive: boolean = true;

    @Property({
        default: 0,
        comment: 'Priority order for document ranking in RAG',
    })
    priority: number = 0;
}
