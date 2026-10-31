import { Entity, Property, Unique } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

export const ToolkitOverrideTableName = 'toolkit_overrides';

/**
 * Admin edits to an Ecbot built-in toolkit. The toolkit itself lives in code
 * (`ECCHO_TOOLKITS`); a null field means "use the code default".
 */
@Entity({ tableName: ToolkitOverrideTableName })
@Unique({ properties: ['slug'] })
export class ToolkitOverrideEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 80 })
    slug!: string;

    @Property({ type: 'varchar', length: 120, nullable: true })
    name?: string | null;

    @Property({ type: 'text', nullable: true })
    description?: string | null;

    @Property({ type: 'varchar', length: 500, nullable: true })
    logo?: string | null;

    @Property({ type: 'varchar', length: 500, nullable: true })
    serverUrl?: string | null;

    @Property({ type: 'jsonb', nullable: true })
    categories?: Array<{ id: string; name: string }> | null;

    /** Hidden from the workspace marketplace and blocked for new installs. */
    @Property({ type: 'boolean', default: false })
    disabled: boolean = false;
}
