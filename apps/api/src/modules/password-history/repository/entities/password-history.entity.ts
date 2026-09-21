import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const PasswordHistoryTableName = 'PasswordHistories';

@Entity({ tableName: 'password_histories' })
@Index({ properties: ['user'] })
@Index({ properties: ['by'] })
export class PasswordHistoryEntity extends DatabaseEntityBase {
    @ManyToOne(() => UserEntity)
    user: UserEntity;

    @Property({ type: 'varchar', length: 255 })
    password: string;

    @Enum(() => ENUM_PASSWORD_HISTORY_TYPE)
    type: ENUM_PASSWORD_HISTORY_TYPE;

    @Property({ type: 'timestamptz' })
    expiredAt: Date;

    @ManyToOne(() => UserEntity)
    by: UserEntity;
}

export type PasswordHistoryDoc = PasswordHistoryEntity;
