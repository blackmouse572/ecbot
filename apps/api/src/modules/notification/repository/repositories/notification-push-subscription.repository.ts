import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { NotificationPushSubscriptionEntity } from '../entities/notification-push-subscription.entity';

@Injectable()
export class NotificationPushSubscriptionRepository extends DatabaseRepository<NotificationPushSubscriptionEntity> {
    constructor(em: EntityManager) {
        super(em, NotificationPushSubscriptionEntity);
    }

    /** A managed reference for the M:1 `user`; a raw id breaks the flush. */
    userReference(userId: string): UserEntity {
        return this.em.getReference(UserEntity, userId);
    }

    /** The user's devices after the newest `keep`, oldest last. */
    findBeyondNewest(
        userId: string,
        keep: number
    ): Promise<NotificationPushSubscriptionEntity[]> {
        return this.find(
            { user: userId },
            { orderBy: { createdAt: 'desc' }, offset: keep }
        );
    }
}
