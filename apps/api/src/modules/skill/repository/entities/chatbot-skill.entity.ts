import {
    Entity,
    Index,
    ManyToOne,
    Property,
    Rel,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { SkillEntity } from './skill.entity';

export const ChatbotSkillTableName = 'chatbot_skills';

@Entity({ tableName: ChatbotSkillTableName })
@Index({ properties: ['chatbot'] })
@Index({ properties: ['skill'] })
@Unique({ properties: ['chatbot', 'skill'] })
export class ChatbotSkillEntity extends DatabaseEntityBase {
    @ManyToOne(() => ChatbotEntity)
    chatbot!: Rel<ChatbotEntity>;

    @ManyToOne(() => SkillEntity)
    skill!: Rel<SkillEntity>;

    @Property({ type: 'boolean', default: true })
    enabled: boolean = true;
}
