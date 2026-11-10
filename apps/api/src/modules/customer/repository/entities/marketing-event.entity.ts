import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { OrderEntity } from 'src/modules/order/repository/entities/order.entity';
import { ProductGroupEntity } from 'src/modules/order/repository/entities/product-group.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '../../enums/customer-marketing.enum';
import { CustomerEntity } from './customer.entity';

export const MarketingEventTableName = 'marketing_events';

/**
 * Append-only history of a Customer's marketing labels and consent, so each
 * label can answer "why". `createdBy` is the member, for OPERATOR and CLIENT
 * rows. The campaign id is a plain uuid until campaigns exist.
 */
@Entity({ tableName: MarketingEventTableName })
@Index({ properties: ['customer', 'createdAt'] })
@Index({ properties: ['workspace', 'createdAt'] })
export class MarketingEventEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => CustomerEntity, { deleteRule: 'cascade' })
    customer: CustomerEntity;

    @Enum(() => ENUM_MARKETING_EVENT_KIND)
    kind: ENUM_MARKETING_EVENT_KIND;

    @Enum(() => ENUM_MARKETING_EVENT_ACTOR)
    actor: ENUM_MARKETING_EVENT_ACTOR;

    @Property({ type: 'varchar', length: 50, nullable: true })
    oldValue?: string | null;

    @Property({ type: 'varchar', length: 50, nullable: true })
    newValue?: string | null;

    @Property({ type: 'varchar', length: 500, nullable: true })
    reason?: string | null;

    @Property({ type: 'uuid', nullable: true })
    conversationId?: string | null;

    @Property({ type: 'uuid', nullable: true })
    messageId?: string | null;

    // History outlives a deleted order or product group.
    @ManyToOne(() => OrderEntity, { nullable: true, deleteRule: 'set null' })
    order?: OrderEntity | null;

    @Property({ type: 'uuid', nullable: true })
    campaignId?: string | null;

    @ManyToOne(() => ProductGroupEntity, {
        nullable: true,
        deleteRule: 'set null',
    })
    productGroup?: ProductGroupEntity | null;
}
