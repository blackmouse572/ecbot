import { Entity, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AccountEntity } from './account.entity';

export const CookieTableName = 'cookies';

@Entity({ tableName: CookieTableName })
export class Cookie extends DatabaseEntityBase {
    @Property({ type: 'boolean', default: false })
    authed: boolean = false;

    @ManyToOne(() => AccountEntity)
    account: AccountEntity;

    @Property({ type: 'varchar', length: 255, nullable: true })
    label?: string;

    @Property({ type: 'varchar', length: 100 })
    status: string;

    @Property({ type: 'timestamptz', nullable: true })
    lastUpdatedAt?: Date;
}
