import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { ENUM_VERIFICATION_TYPE } from 'src/modules/verification/enums/verification.enum.constant';

export const VerificationTableName = 'Verifications';

@Entity({ tableName: 'verifications' })
@Index({ properties: ['user'] })
@Index({ properties: ['type'] })
@Index({ properties: ['isActive'] })
@Index({ properties: ['isVerify'] })
export class VerificationEntity extends DatabaseEntityBase {
    @ManyToOne(() => UserEntity)
    user: UserEntity;

    @Property({ type: 'varchar', length: 255 })
    to: string;

    @Enum(() => ENUM_VERIFICATION_TYPE)
    type: ENUM_VERIFICATION_TYPE;

    @Property({ type: 'varchar', length: 255 })
    otp: string;

    @Property({ type: 'timestamptz' })
    expiredDate: Date;

    @Property({ type: 'timestamptz', nullable: true })
    verifyDate?: Date;

    @Property({ type: 'boolean', default: true })
    isActive: boolean = true;

    @Property({ type: 'boolean', default: false })
    isVerify: boolean = false;

    @Property({ type: 'varchar', length: 255 })
    reference: string;

    @Property({ type: 'integer', default: 0 })
    otpAttempt: number = 0;
}
