import {
    Entity,
    Enum,
    Index,
    PrimaryKey,
    Property,
} from '@mikro-orm/postgresql';
import { randomUUID as uuidV4 } from 'node:crypto';
import { ENUM_CONVERSATION_ACTIVITY_KIND } from '../../enums/conversation-activity.enum';
import { IConversationActivityPayload } from '../../interfaces/conversation-activity.interface';

export const ConversationActivityTableName = 'conversation_activities';

/**
 * What the agent did for a channel reply that left no other record: a skill
 * loaded, a knowledge search. Spliced under the next BOT message like tool
 * invocations, and like them an audit log: no soft delete, the prune
 * scheduler hard-deletes rows after the same retention.
 */
@Entity({ tableName: ConversationActivityTableName })
@Index({ properties: ['conversationId', 'createdAt'] })
@Index({ properties: ['createdAt'] })
export class ConversationActivityEntity {
    @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
    id: string = uuidV4();

    @Property({ type: 'uuid' })
    conversationId!: string;

    @Enum(() => ENUM_CONVERSATION_ACTIVITY_KIND)
    kind!: ENUM_CONVERSATION_ACTIVITY_KIND;

    @Property({ type: 'varchar', length: 120, nullable: true })
    label?: string;

    @Property({ type: 'jsonb', nullable: true })
    payload?: IConversationActivityPayload;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt: Date = new Date();
}
