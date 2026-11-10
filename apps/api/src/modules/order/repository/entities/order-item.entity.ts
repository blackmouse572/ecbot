import {
    BigIntType,
    Entity,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { OrderEntity } from './order.entity';
import { ProductGroupEntity } from './product-group.entity';

export const OrderItemTableName = 'order_items';

/** One line of an order. Items are free text; the group is optional. */
@Entity({ tableName: OrderItemTableName })
@Index({ properties: ['order'] })
@Index({ properties: ['productGroup'] })
export class OrderItemEntity extends DatabaseEntityBase {
    @ManyToOne(() => OrderEntity, { deleteRule: 'cascade' })
    order: OrderEntity;

    @Property({ type: 'varchar', length: 255 })
    name: string;

    // Deleting a group keeps the item and its name.
    @ManyToOne(() => ProductGroupEntity, {
        nullable: true,
        deleteRule: 'set null',
    })
    productGroup?: ProductGroupEntity;

    @Property({ type: 'integer', default: 1 })
    quantity: number = 1;

    // Minor units. Null when only the order total is known (CSV import).
    @Property({ type: new BigIntType('number'), nullable: true })
    unitPrice?: number;
}
