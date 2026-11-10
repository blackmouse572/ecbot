import {
    BigIntType,
    Collection,
    Entity,
    Enum,
    Index,
    ManyToOne,
    OneToMany,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { CustomerEntity } from 'src/modules/customer/repository/entities/customer.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../../enums/order.enum';
import type { OrderItemEntity } from './order-item.entity';

export const OrderTableName = 'orders';

/**
 * A customer's order. Only CONFIRMED orders count as purchases for the
 * journey stage and the repurchase cycle; a bot draft from chat starts
 * PENDING until an operator confirms it.
 */
@Entity({ tableName: OrderTableName })
@Unique({ properties: ['workspace', 'code'] })
@Index({ properties: ['workspace', 'orderedAt'] })
@Index({ properties: ['customer', 'orderedAt'] })
export class OrderEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    // Erasing a customer erases their orders with them.
    @ManyToOne(() => CustomerEntity, { deleteRule: 'cascade' })
    customer: CustomerEntity;

    // Unique per workspace; CSV import skips rows whose code already exists.
    @Property({ type: 'varchar', length: 64 })
    code: string;

    // Minor units, like plan prices (1 = 1 đồng for VND).
    @Property({ type: new BigIntType('number'), default: 0 })
    total: number = 0;

    @Property({ type: 'varchar', length: 3 })
    currency: string;

    @Enum(() => ENUM_ORDER_STATUS)
    status: ENUM_ORDER_STATUS;

    @Enum(() => ENUM_ORDER_SOURCE)
    source: ENUM_ORDER_SOURCE;

    @Property({ type: 'timestamptz' })
    orderedAt: Date;

    @Property({ type: 'timestamptz', nullable: true })
    confirmedAt?: Date;

    @Property({ type: 'text', nullable: true })
    note?: string;

    // The conversation the bot drafted the order in, for the "vì sao" link.
    @Property({ type: 'uuid', nullable: true })
    conversationId?: string;

    @OneToMany('OrderItemEntity', 'order', { orphanRemoval: true })
    items = new Collection<OrderItemEntity>(this);
}
