import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { NotificationStatus } from 'src/modules/notification/enums/notification.enum';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends DatabaseRepository<NotificationEntity> {
    constructor(em: EntityManager) {
        super(em, NotificationEntity);
    }

    async findByRecipient(recipientId: string): Promise<NotificationEntity[]> {
        return this.find(
            { recipient: recipientId },
            { populate: ['recipient', 'sender'] }
        );
    }

    async findUnreadByRecipient(
        recipientId: string
    ): Promise<NotificationEntity[]> {
        return this.find(
            { recipient: recipientId, status: NotificationStatus.UNREAD },
            { populate: ['recipient', 'sender'] }
        );
    }

    async markAsRead(notificationId: string): Promise<NotificationEntity> {
        const notification = await this.findOneById(notificationId);
        notification.status = NotificationStatus.READ;
        notification.readAt = new Date();
        await this.em.persistAndFlush(notification);
        return notification;
    }

    async markAllAsReadByRecipient(recipientId: string): Promise<number> {
        const notifications = await this.find({
            recipient: recipientId,
            status: NotificationStatus.UNREAD,
        });

        notifications.forEach(notification => {
            notification.status = NotificationStatus.READ;
            notification.readAt = new Date();
        });

        await this.em.persistAndFlush(notifications);
        return notifications.length;
    }

    async markAsArchived(notificationId: string): Promise<NotificationEntity> {
        const notification = await this.findOneById(notificationId);
        notification.status = NotificationStatus.ARCHIVED;
        notification.archivedAt = new Date();
        await this.em.persistAndFlush(notification);
        return notification;
    }

    async countUnreadByRecipient(recipientId: string): Promise<number> {
        return this.getTotal({
            recipient: recipientId,
            status: NotificationStatus.UNREAD,
        });
    }

    async findByType(
        type: string,
        recipientId?: string
    ): Promise<NotificationEntity[]> {
        const filters: any = { type };
        if (recipientId) {
            filters.recipient = recipientId;
        }
        return this.find(filters, { populate: ['recipient', 'sender'] });
    }

    async findExpiredNotifications(): Promise<NotificationEntity[]> {
        return this.find({
            expiresAt: { $lt: new Date() },
        });
    }
}
