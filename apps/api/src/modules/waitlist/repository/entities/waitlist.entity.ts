import { Entity, Index, Property, Unique } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

export const WaitlistTableName = 'waitlists';

@Entity({ tableName: WaitlistTableName })
@Index({ properties: ['source'] })
@Unique({ properties: ['email'] })
export class WaitlistEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 320 })
    email: string;

    // Page/campaign the signup came from, e.g. 'hero', 'solutions/retail'.
    @Property({ type: 'varchar', length: 100, nullable: true })
    source?: string;

    @Property({ type: 'varchar', length: 10, nullable: true })
    locale?: string;
}

export type WaitlistDoc = WaitlistEntity;
