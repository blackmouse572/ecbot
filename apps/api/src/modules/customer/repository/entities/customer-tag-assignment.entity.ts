import { Entity, Index, ManyToOne, Unique } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { CustomerEntity } from './customer.entity';
import { CustomerTagEntity } from './customer-tag.entity';

export const CustomerTagAssignmentTableName = 'customer_tag_assignments';

@Entity({ tableName: CustomerTagAssignmentTableName })
@Index({ properties: ['customer'] })
@Index({ properties: ['tag'] })
@Unique({ properties: ['customer', 'tag'] })
export class CustomerTagAssignmentEntity extends DatabaseEntityBase {
    @ManyToOne(() => CustomerEntity)
    customer: CustomerEntity;

    @ManyToOne(() => CustomerTagEntity)
    tag: CustomerTagEntity;
}
