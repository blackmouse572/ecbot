import { Embeddable, Enum, Property } from '@mikro-orm/postgresql';
import { ENUM_DATABASE_LOCATION_TYPE } from 'src/common/database/enums/database.enum';

@Embeddable()
export class DatabaseLocationEntity {
    @Enum(() => ENUM_DATABASE_LOCATION_TYPE)
    @Property({ default: ENUM_DATABASE_LOCATION_TYPE.POINT })
    type: ENUM_DATABASE_LOCATION_TYPE = ENUM_DATABASE_LOCATION_TYPE.POINT;

    @Property({ type: 'array' })
    coordinates: number[] = [];
}
