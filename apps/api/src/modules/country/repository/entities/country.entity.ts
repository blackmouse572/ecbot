import { Entity, Index, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

export const CountryTableName = 'countries';

@Entity({ tableName: CountryTableName })
@Index({ properties: ['name'] })
@Index({ properties: ['alpha2Code'] })
@Index({ properties: ['alpha3Code'] })
@Index({ properties: ['phoneCode'] })
export class CountryEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 100 })
    name: string;

    @Property({
        type: 'varchar',
        length: 2,
        unique: true,
    })
    alpha2Code: string;

    @Property({
        type: 'varchar',
        length: 3,
        unique: true,
    })
    alpha3Code: string;

    @Property({
        type: 'varchar',
        length: 3,
        unique: true,
    })
    numericCode: string;

    @Property({
        type: 'varchar',
        length: 3,
        nullable: true,
    })
    fipsCode?: string;

    @Property({ type: 'json' })
    phoneCode: string[];

    @Property({ type: 'varchar', length: 100, nullable: true })
    phonePattern?: string;

    @Property({ type: 'varchar', length: 50, nullable: true })
    continent?: string;

    @Property({ type: 'varchar', length: 100 })
    timeZone: string;

    @Property({ type: 'varchar', length: 10 })
    currency: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    domain?: string;
}

export type CountryDoc = CountryEntity;
