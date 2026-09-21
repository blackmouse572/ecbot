import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Embeddable,
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import {
    NotificationPriority,
    NotificationStatus,
    NotificationType,
} from 'src/modules/notification/enums/notification.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const NotificationTableName = 'notifications';

@Embeddable()
export class NotificationMetadata {
    @Property({ type: 'varchar', length: 500, nullable: true })
    actionUrl?: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    actionText?: string;

    @Property({ type: 'json', nullable: true })
    data?: Record<string, any>;
}

@Entity({ tableName: NotificationTableName })
@Index({ properties: ['recipient'] })
@Index({ properties: ['sender'] })
@Index({ properties: ['status'] })
@Index({ properties: ['type'] })
@Index({ properties: ['priority'] })
export class NotificationEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 255 })
    title: string;

    @Property({ type: 'varchar', length: 1000 })
    message: string;

    @Enum(() => NotificationType)
    type: NotificationType;

    @Enum(() => NotificationPriority)
    priority: NotificationPriority = NotificationPriority.MEDIUM;

    @Enum(() => NotificationStatus)
    status: NotificationStatus = NotificationStatus.UNREAD;

    @ManyToOne(() => UserEntity)
    recipient: UserEntity;

    @ManyToOne(() => UserEntity, { nullable: true })
    sender?: UserEntity;

    @Embedded(() => NotificationMetadata, { nullable: true })
    metadata?: NotificationMetadata;

    @Property({ type: 'timestamptz', nullable: true })
    readAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    archivedAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    scheduledAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    expiresAt?: Date;

    @Property({ type: 'array', default: '{}' })
    tags: string[] = [];

    @ManyToOne(() => WorkspaceEntity, { nullable: true })
    workspace?: WorkspaceEntity;
}

export type NotificationDoc = NotificationEntity;
