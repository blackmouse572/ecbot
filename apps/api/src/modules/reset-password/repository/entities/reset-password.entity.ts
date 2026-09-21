import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_RESET_PASSWORD_TYPE } from 'src/modules/reset-password/enums/reset-password.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const ResetPasswordTableName = 'ResetPasswords';

@Entity({ tableName: 'reset_passwords' })
@Index({ properties: ['user'] })
@Index({ properties: ['token'] })
@Index({ properties: ['type'] })
@Index({ properties: ['isReset'] })
@Index({ properties: ['isActive'] })
@Index({ properties: ['reference'] })
export class ResetPasswordEntity extends DatabaseEntityBase {
    @ManyToOne(() => UserEntity)
    user: UserEntity;

    @Property({ type: 'varchar', length: 255 })
    to: string;

    @Property({ type: 'varchar', length: 6 })
    otp: string;

    @Property({ type: 'varchar', length: 20, unique: true })
    token: string;

    @Enum(() => ENUM_RESET_PASSWORD_TYPE)
    type: ENUM_RESET_PASSWORD_TYPE;

    @Property({ type: 'timestamptz' })
    expiredDate: Date;

    @Property({ type: 'timestamptz', nullable: true })
    resetDate?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    verifyDate?: Date;

    @Property({ type: 'boolean', default: false })
    isReset: boolean = false;

    @Property({ type: 'boolean', default: false })
    isActive: boolean = false;

    @Property({ type: 'varchar', length: 255 })
    reference: string;
}
