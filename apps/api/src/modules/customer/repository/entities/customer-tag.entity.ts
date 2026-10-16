import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_CUSTOMER_TAG_SYSTEM_KEY } from '../../enums/customer-tag.enum';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

export const CustomerTagTableName = 'customer_tags';

@Entity({ tableName: CustomerTagTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['workspace', 'systemKey'] })
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

    // Tells the team when applied, without turning the bot off (#288).
    @Property({ type: 'boolean', default: false })
    notifiesTeam: boolean = false;

    // Set on the default catalog only, so analytics can find "Order placed"
    // or "Positive" whatever the owner renamed them to.
    @Enum({ items: () => ENUM_CUSTOMER_TAG_SYSTEM_KEY, nullable: true })
    systemKey?: ENUM_CUSTOMER_TAG_SYSTEM_KEY;
}
