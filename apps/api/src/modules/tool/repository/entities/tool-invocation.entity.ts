import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    PrimaryKey,
    Property,
    Rel,
} from '@mikro-orm/postgresql';
import { v4 as uuidV4 } from 'uuid';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';

export const ToolInvocationTableName = 'tool_invocations';

/**
 * NOTE: Does NOT extend DatabaseEntityBase. This is an audit log; the prune cron in commit #8
 * hard-deletes rows older than 30 days, so the deleted/deletedAt/deletedBy machinery would be
 * actively counterproductive. Documented in the spec under commit #8.
 */
@Entity({ tableName: ToolInvocationTableName })
@Index({ properties: ['chatbot'] })
@Index({ properties: ['tool'] })
@Index({ properties: ['conversationId'] })
@Index({ properties: ['correlationId'] })
@Index({ properties: ['createdAt'] })
export class ToolInvocationEntity {
    @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
    id: string = uuidV4();

    @ManyToOne(() => ToolEntity)
    tool!: Rel<ToolEntity>;

    @ManyToOne(() => ChatbotEntity)
    chatbot!: Rel<ChatbotEntity>;

    @Property({ type: 'uuid', nullable: true })
    conversationId?: string;

    @Property({ type: 'varchar', length: 64 })
    correlationId!: string;

    @Enum(() => ENUM_TOOL_INVOCATION_STATUS)
    status!: ENUM_TOOL_INVOCATION_STATUS;

    @Property({ type: 'varchar', length: 120, nullable: true })
    actionName?: string;

    @Property({ type: 'jsonb' })
    inputArgs!: Record<string, unknown>;

    @Property({ type: 'jsonb', nullable: true })
    outputResult?: unknown;

    @Property({ type: 'text', nullable: true })
    errorMessage?: string;

    @Property({ type: 'int' })
    durationMs!: number;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt: Date = new Date();
}
