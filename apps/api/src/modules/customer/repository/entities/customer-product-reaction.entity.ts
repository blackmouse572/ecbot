import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ProductGroupEntity } from 'src/modules/order/repository/entities/product-group.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { CustomerEntity } from './customer.entity';

export const CustomerProductReactionTableName = 'customer_product_reactions';

/**
 * "Tạm hoãn <product group> đến <date>": do not offer this group until then.
 * Other groups can still be offered. Expires by date, so reads filter on
 * `until > now`; no job clears it.
 */
@Entity({ tableName: CustomerProductReactionTableName })
@Unique({ properties: ['customer', 'productGroup'] })
export class CustomerProductReactionEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => CustomerEntity, { deleteRule: 'cascade' })
    customer: CustomerEntity;

    @ManyToOne(() => ProductGroupEntity, { deleteRule: 'cascade' })
    productGroup: ProductGroupEntity;

    @Property({ type: 'timestamptz' })
    until: Date;

    // The customer's words, or the operator's reason.
    @Property({ type: 'varchar', length: 500, nullable: true })
    reason?: string | null;
}
