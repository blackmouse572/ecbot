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
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';

export const ChatbotToolTableName = 'chatbot_tools';

@Entity({ tableName: ChatbotToolTableName })
@Index({ properties: ['chatbot'] })
@Index({ properties: ['tool'] })
@Unique({ properties: ['chatbot', 'tool'] })
export class ChatbotToolEntity extends DatabaseEntityBase {
    @ManyToOne(() => ChatbotEntity)
    chatbot!: Rel<ChatbotEntity>;

    @ManyToOne(() => ToolEntity)
    tool!: Rel<ToolEntity>;

    @Property({ type: 'boolean', default: true })
    enabled: boolean = true;

    @Property({ type: 'jsonb', nullable: true })
    enabledActions?: string[]; // null = all actions; only meaningful for MCP
}
