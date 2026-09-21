import {
    Entity,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

export const CustomerTagTableName = 'customer_tags';

@Entity({ tableName: CustomerTagTableName })
@Index({ properties: ['workspace'] })
@Unique({ properties: ['workspace', 'name'] })
export class CustomerTagEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({ type: 'varchar', length: 64 })
    name: string;

    @Property({ type: 'varchar', length: 16, nullable: true })
    emoji?: string;

    @Property({ type: 'text', nullable: true })
    description?: string;

    @Property({ type: 'boolean', default: false })
    triggersHandoff: boolean = false;
}
