import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_USAGE_EVENT_TYPE } from '../../enums/usage-event-type.enum';

@Entity({ tableName: 'usage_events' })
@Index({ properties: ['workspace', 'eventType', 'createdAt'] })
@Index({ properties: ['workspace', 'createdAt'] })
export class UsageEventEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => UserEntity, { nullable: true })
    user?: UserEntity;

    @Enum(() => ENUM_USAGE_EVENT_TYPE)
    eventType: ENUM_USAGE_EVENT_TYPE;

    @Property({
        comment: 'Amount of usage (bytes for storage, tokens for AI, etc)',
    })
    amount: number;

    @Property({
        comment: 'Source of usage: KNOWLEDGE_BASE, CHATBOT, AI_PROCESSING',
    })
    source: string;

    @Property({
        type: 'json',
        nullable: true,
        comment: 'Additional event details and context',
    })
    metadata?: Record<string, any>;
}
