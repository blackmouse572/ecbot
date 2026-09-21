import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import {
    Entity,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

export const ConversationReadTableName = 'conversation_reads';

@Entity({ tableName: ConversationReadTableName })
@Unique({ properties: ['operatorId', 'conversation'] })
@Index({ properties: ['operatorId'] })
@Index({ properties: ['conversation'] })
export class ConversationReadEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 255 })
    operatorId: string;

    @ManyToOne(() => ConversationEntity, { deleteRule: 'cascade' })
    conversation: ConversationEntity;

    @Property({ type: 'timestamptz' })
    lastReadAt: Date = new Date();
}
