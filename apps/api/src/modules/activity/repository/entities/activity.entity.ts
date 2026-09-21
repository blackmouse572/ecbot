import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_ACTIVITY_ACTION } from '../../enums/activity.enum';

export const ActivityTableName = 'activities';

@Entity({ tableName: ActivityTableName })
@Index({ properties: ['user'] })
@Index({ properties: ['workspace'] })
@Index({ properties: ['by'] })
export class ActivityEntity extends DatabaseEntityBase {
    @ManyToOne(() => UserEntity)
    user: UserEntity;

    @ManyToOne(() => WorkspaceEntity, { nullable: true })
    workspace?: WorkspaceEntity;

    @Enum(() => ENUM_POLICY_SUBJECT)
    subject: ENUM_POLICY_SUBJECT;

    @Enum(() => ENUM_ACTIVITY_ACTION)
    action: ENUM_ACTIVITY_ACTION;

    @ManyToOne(() => UserEntity)
    by: UserEntity;

    @Property({ type: 'json', nullable: true })
    metadata?: Record<string, any>;
}

export type ActivityDoc = ActivityEntity;
