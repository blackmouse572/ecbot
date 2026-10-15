import {
    Collection,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import type { ContactPointEntity } from './contact-point.entity';
import type { CustomerTagAssignmentEntity } from './customer-tag-assignment.entity';

export const CustomerTableName = 'customers';

@Entity({ tableName: CustomerTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['phone'] })
@Index({ properties: ['email'] })
@Index({ properties: ['mergedIntoCustomerId'] })
export class CustomerEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({ type: 'varchar', length: 255, nullable: true })
    name?: string;

    @Property({ type: 'varchar', length: 50, nullable: true })
    phone?: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    email?: string;

    @Property({ type: 'varchar', length: 10, nullable: true })
    language?: string;

    @Property({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;

    @Property({ type: 'text', nullable: true })
    profileSummary?: string;

    @Property({ type: 'text', nullable: true })
    notes?: string;

    @Property({ type: 'uuid', nullable: true })
    mergedIntoCustomerId?: string;

    // Inverse sides, so a list can filter customers by channel or tag. By
    // name: a class import would cycle with the owning entities.
    @OneToMany('ContactPointEntity', 'customer')
    contactPoints = new Collection<ContactPointEntity>(this);

    @OneToMany('CustomerTagAssignmentEntity', 'customer')
    tagAssignments = new Collection<CustomerTagAssignmentEntity>(this);
}
