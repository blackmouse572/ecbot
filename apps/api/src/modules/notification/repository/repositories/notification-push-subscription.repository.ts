import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { NotificationPushSubscriptionEntity } from '../entities/notification-push-subscription.entity';

@Injectable()
export class NotificationPushSubscriptionRepository extends DatabaseRepository<NotificationPushSubscriptionEntity> {
    constructor(em: EntityManager) {
        super(em, NotificationPushSubscriptionEntity);
    }
}
