import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const NotificationPushSubscriptionTableName =
    'notification_push_subscriptions';

/** One browser or installed app that receives a user's notifications as push. */
@Entity({ tableName: NotificationPushSubscriptionTableName })
@Index({ properties: ['user'] })
export class NotificationPushSubscriptionEntity extends DatabaseEntityBase {
    @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
    user: UserEntity;

    @Property({ type: 'text', unique: true })
    endpoint: string;

    @Property({ type: 'varchar', length: 255 })
    p256dh: string;

    @Property({ type: 'varchar', length: 255 })
    auth: string;

    @Property({ type: 'varchar', length: 500, nullable: true })
    userAgent?: string;
}
