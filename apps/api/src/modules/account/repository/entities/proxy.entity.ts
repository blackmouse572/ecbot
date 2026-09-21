import { Entity, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Entity({ tableName: 'proxies' })
export class Proxy extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 255 })
    host: string;

    @Property({ type: 'integer' })
    port: number;

    @Property({ type: 'varchar', length: 100 })
    status: string;

    @Property({ type: 'varchar', length: 50 })
    protocol: string;

    @Property({ type: 'boolean', default: false })
    authed: boolean = false;

    @Property({ type: 'varchar', length: 255, nullable: true })
    username?: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    password?: string;

    @ManyToOne(() => UserEntity, { nullable: true })
    addedBy?: UserEntity;
}
