import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_CUSTOMER_TAG_EVENT_ACTION,
    ENUM_CUSTOMER_TAG_EVENT_ACTOR,
} from '../../enums/customer-tag.enum';
import { CustomerEntity } from './customer.entity';
import { CustomerTagEntity } from './customer-tag.entity';

export const CustomerTagEventTableName = 'customer_tag_events';

/**
 * Append-only history of tags applied to and removed from customers. The
 * assignments table only holds what is on a customer now; this is what the
 * dashboard counts over time (orders, positive conversations). `createdBy`
 * is the member, for OPERATOR and CLIENT rows.
 */
@Entity({ tableName: CustomerTagEventTableName })
@Index({ properties: ['workspace', 'createdAt'] })
@Index({ properties: ['tag'] })
@Index({ properties: ['customer'] })
export class CustomerTagEventEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => CustomerEntity)
    customer: CustomerEntity;

    @ManyToOne(() => CustomerTagEntity)
    tag: CustomerTagEntity;

    @Enum(() => ENUM_CUSTOMER_TAG_EVENT_ACTION)
    action: ENUM_CUSTOMER_TAG_EVENT_ACTION;

    @Enum(() => ENUM_CUSTOMER_TAG_EVENT_ACTOR)
    actor: ENUM_CUSTOMER_TAG_EVENT_ACTOR;

    // The conversation the bot or classifier was in, when there was one.
    @Property({ type: 'uuid', nullable: true })
    conversationId?: string;
}
