import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const SessionTableName = 'sessions';

@Entity({ tableName: SessionTableName })
@Index({ properties: ['status'] })
@Index({ properties: ['user'] })
@Index({ properties: ['expiredAt'] })
@Index({ properties: ['deleted'] })
export class SessionEntity extends DatabaseEntityBase {
    @Enum(() => ENUM_SESSION_STATUS)
    status: ENUM_SESSION_STATUS = ENUM_SESSION_STATUS.ACTIVE;

    @Property({ type: 'timestamptz', nullable: true })
    revokeAt?: Date;

    @ManyToOne(() => UserEntity, { eager: false })
    user: UserEntity;

    @Property({ type: 'varchar' })
    ip: string;

    @Property({ type: 'varchar' })
    hostname: string;

    @Property({ type: 'varchar' })
    protocol: string;

    @Property({ type: 'varchar' })
    originalUrl: string;

    @Property({ type: 'varchar' })
    method: string;

    @Property({ type: 'varchar', nullable: true })
    userAgent?: string;

    @Property({ type: 'varchar', nullable: true })
    xForwardedFor?: string;

    @Property({ type: 'varchar', nullable: true })
    xForwardedHost?: string;

    @Property({ type: 'varchar', nullable: true })
    xForwardedPorto?: string;

    // ISO country code resolved from `ip` at session creation (geo-IP lookup).
    @Property({ type: 'varchar', length: 2, nullable: true })
    country?: string;

    // Bumped (throttled) on each authenticated request for session oversight.
    @Property({ type: 'timestamptz', nullable: true })
    lastActiveAt?: Date;

    @Property({ type: 'timestamptz' })
    expiredAt: Date;
}
