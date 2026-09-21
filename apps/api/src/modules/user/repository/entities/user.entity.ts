import {
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { Exclude } from 'class-transformer';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AwsS3Entity } from 'src/modules/aws/repository/entities/aws.s3.entity';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/enums/user.enum';
import { UserMobileNumberEntity } from 'src/modules/user/repository/entities/user.mobile-number.entity';
import { UserVerificationEntity } from 'src/modules/user/repository/entities/user.verification.entity';

export const UserTableName = 'users';

@Entity({ tableName: UserTableName })
@Index({ properties: ['name'] })
@Index({ properties: ['username'] })
@Index({ properties: ['email'] })
export class UserEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 100 })
    name: string;

    @Property({ type: 'varchar', length: 50, unique: true, nullable: true })
    username?: string;

    @Embedded(() => UserMobileNumberEntity, { nullable: true })
    mobileNumber?: UserMobileNumberEntity;

    @Embedded(() => UserVerificationEntity, {
        nullable: true,
    })
    @Exclude()
    verification?: UserVerificationEntity;

    @Property({ type: 'varchar', length: 100, unique: true })
    email: string;

    @ManyToOne(() => RoleEntity)
    role: RoleEntity;

    @Property({ type: 'varchar' })
    @Exclude()
    password: string;

    @Property({ type: 'timestamptz' })
    @Exclude()
    passwordExpired: Date;

    @Property({ type: 'timestamptz' })
    @Exclude()
    passwordCreated: Date;

    @Property({ type: 'integer', default: 0 })
    passwordAttempt: number;

    @Property({ type: 'timestamptz' })
    signUpDate: Date;

    @Enum(() => ENUM_USER_SIGN_UP_FROM)
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @Property({ type: 'varchar' })
    @Exclude()
    salt: string;

    @Enum(() => ENUM_USER_STATUS)
    status: ENUM_USER_STATUS = ENUM_USER_STATUS.ACTIVE;

    @Embedded(() => AwsS3Entity, { nullable: true })
    photo?: AwsS3Entity;

    @Enum({
        items: () => ENUM_USER_GENDER,
        nullable: true,
        default: ENUM_USER_GENDER.MALE,
    })
    gender?: ENUM_USER_GENDER;

    @ManyToOne(() => CountryEntity)
    country: CountryEntity;

    @Property({ type: 'varchar', nullable: true })
    avatar?: string;

    public get isEmailVerified(): boolean {
        return this.verification.email;
    }

    public get isMobileNumberVerified(): boolean {
        return this.verification.mobileNumber;
    }
}

export type UserDoc = UserEntity;
export type IUserDoc = UserEntity;
