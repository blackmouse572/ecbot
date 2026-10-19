import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationPushSubscriptionEntity } from './entities/notification-push-subscription.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationPushSubscriptionRepository } from './repositories/notification-push-subscription.repository';
import { NotificationRepository } from './repositories/notification.repository';

@Module({
    providers: [NotificationRepository, NotificationPushSubscriptionRepository],
    exports: [NotificationRepository, NotificationPushSubscriptionRepository],
    imports: [
        MikroOrmModule.forFeature([
            NotificationEntity,
            NotificationPushSubscriptionEntity,
        ]),
    ],
})
export class NotificationRepositoryModule {}
