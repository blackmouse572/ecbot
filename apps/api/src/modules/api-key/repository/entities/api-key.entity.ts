import { Entity, Enum, Index, Property, Unique } from '@mikro-orm/core';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

export const ApiKeyTableName = 'api_keys';

@Entity({ tableName: ApiKeyTableName })
@Index({ properties: ['type'] })
@Index({ properties: ['name'] })
@Index({ properties: ['isActive'] })
@Index({ properties: ['deleted'] })
@Unique({ properties: ['key'] })
export class ApiKeyEntity extends DatabaseEntityBase {
    @Enum(() => ENUM_API_KEY_TYPE)
    type: ENUM_API_KEY_TYPE;

    @Property({ type: 'varchar', length: 100 })
    name: string;

    @Property({ type: 'varchar', length: 50 })
    key: string;

    @Property({ type: 'varchar' })
    hash: string;

    @Property({ type: 'boolean' })
    isActive: boolean;

    @Property({ type: 'timestamptz', nullable: true })
    startDate?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    endDate?: Date;
}
