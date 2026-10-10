import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Rel,
} from '@mikro-orm/postgresql';
import { Exclude } from 'class-transformer';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_ACTIVITY_ACTION } from '../../enums/activity.enum';

export const ActivityTableName = 'activities';

// Append-only audit log: a database trigger rejects UPDATE, DELETE and
// TRUNCATE (migration 20261008110000). Every FK uses ON DELETE NO ACTION,
// because SET NULL / CASCADE would rewrite or remove audit rows; users and
// workspaces are soft-deleted, never hard-deleted.
@Entity({ tableName: ActivityTableName })
@Index({ properties: ['user'] })
@Index({ properties: ['workspace'] })
@Index({ properties: ['by'] })
export class ActivityEntity extends DatabaseEntityBase {
    @ManyToOne(() => UserEntity)
    user: UserEntity;

    @ManyToOne(() => WorkspaceEntity, {
        nullable: true,
        deleteRule: 'no action',
    })
    workspace?: WorkspaceEntity;

    @ManyToOne('UserEntity', { nullable: true, deleteRule: 'no action' })
    @Exclude({ toPlainOnly: true })
    createdBy?: Rel<any>;

    @ManyToOne('UserEntity', { nullable: true, deleteRule: 'no action' })
    @Exclude({ toPlainOnly: true })
    updatedBy?: Rel<any>;

    @ManyToOne('UserEntity', { nullable: true, deleteRule: 'no action' })
    @Exclude({ toPlainOnly: true })
    deletedBy?: Rel<any>;

    @Enum(() => ENUM_POLICY_SUBJECT)
    subject: ENUM_POLICY_SUBJECT;

    @Enum(() => ENUM_ACTIVITY_ACTION)
    action: ENUM_ACTIVITY_ACTION;

    @ManyToOne(() => UserEntity)
    by: UserEntity;

    @Property({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    // Filled by ActivityService from the current request (null outside one).
    @Property({ type: 'varchar', length: 45, nullable: true })
    ipAddress?: string;

    @Property({ type: 'text', nullable: true })
    userAgent?: string;
}

export type ActivityDoc = ActivityEntity;
