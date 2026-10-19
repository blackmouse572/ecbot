import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, { PushSubscription, VapidKeys } from 'web-push';
import {
    NOTIFICATION_PUSH_MAX_DEVICES_PER_USER,
    NOTIFICATION_PUSH_SEND_BATCH_SIZE,
} from '../constants/notification.push.constant';
import { NotificationPushSubscribeRequestDto } from '../dtos/request/notification.push-subscribe.request.dto';
import { NotificationEntity } from '../repository/entities/notification.entity';
import { NotificationPushSubscriptionRepository } from '../repository/repositories/notification-push-subscription.repository';

// The push service has dropped the device: the user removed the permission or
// the browser rotated its subscription.
const GONE_STATUS_CODES = [404, 410];

/** Sends in-app notifications to the user's devices as Web Push (VAPID). */
@Injectable()
export class NotificationPushService {
    private readonly logger = new Logger(NotificationPushService.name);
    private readonly vapid?: VapidKeys & { subject: string };

    constructor(
        private readonly subscriptionRepository: NotificationPushSubscriptionRepository,
        configService: ConfigService
    ) {
        const publicKey = configService.get<string>('webPush.publicKey');
        const privateKey = configService.get<string>('webPush.privateKey');
        const subject = configService.get<string>('webPush.subject');
        if (publicKey && privateKey && subject) {
            this.vapid = { publicKey, privateKey, subject };
        }
    }

    publicKey(): string | null {
        return this.vapid?.publicKey ?? null;
    }

    async subscribe(
        userId: string,
        { endpoint, keys }: NotificationPushSubscribeRequestDto,
        userAgent?: string
    ): Promise<void> {
        const existing = await this.subscriptionRepository.findOne({
            endpoint,
        });
        const device = {
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: userAgent?.slice(0, 500),
        };

        if (!existing) {
            await this.subscriptionRepository.create({
                user: this.subscriptionRepository.userReference(userId),
                endpoint,
                ...device,
            });
            await this.dropOldestDevices(userId);
            return;
        }

        // A browser that is already subscribed sends the same endpoint again
        // (reload, second tab). Another account may take it over only from
        // that same browser, which proves it by holding the same auth secret.
        if (existing.user.id !== userId && existing.auth !== keys.auth) {
            return;
        }
        Object.assign(existing, device);
        existing.user = this.subscriptionRepository.userReference(userId);
        await this.subscriptionRepository.save(existing);
    }

    private async dropOldestDevices(userId: string): Promise<void> {
        const extra = await this.subscriptionRepository.findBeyondNewest(
            userId,
            NOTIFICATION_PUSH_MAX_DEVICES_PER_USER
        );
        if (extra.length === 0) return;
        await this.subscriptionRepository.deleteMany({
            id: { $in: extra.map(device => device.id) },
        });
    }

    async unsubscribe(userId: string, endpoint: string): Promise<void> {
        await this.subscriptionRepository.deleteMany({
            user: userId,
            endpoint,
        });
    }

    /** Never throws: a push is a bonus on top of the bell. */
    async sendToUser(
        userId: string,
        notification: NotificationEntity
    ): Promise<void> {
        if (!this.vapid) return;

        try {
            const devices = await this.subscriptionRepository.find({
                user: userId,
            });
            if (devices.length === 0) return;

            const payload = JSON.stringify({
                id: notification.id,
                title: notification.title,
                body: notification.message,
                url: notification.metadata?.actionUrl,
            });
            const gone: string[] = [];

            const sendOne = async (
                device: (typeof devices)[number]
            ): Promise<void> => {
                const target: PushSubscription = {
                    endpoint: device.endpoint,
                    keys: { p256dh: device.p256dh, auth: device.auth },
                };
                try {
                    await webpush.sendNotification(target, payload, {
                        vapidDetails: this.vapid,
                        TTL: 60 * 60 * 24,
                        timeout: 5000,
                    });
                } catch (err: unknown) {
                    const status = (err as { statusCode?: number })?.statusCode;
                    if (status && GONE_STATUS_CODES.includes(status)) {
                        gone.push(device.id);
                        return;
                    }
                    this.logger.warn(
                        `push failed user=${userId} status=${status}: ${String((err as Error)?.message ?? err)}`
                    );
                }
            };

            for (
                let i = 0;
                i < devices.length;
                i += NOTIFICATION_PUSH_SEND_BATCH_SIZE
            ) {
                await Promise.all(
                    devices
                        .slice(i, i + NOTIFICATION_PUSH_SEND_BATCH_SIZE)
                        .map(sendOne)
                );
            }

            if (gone.length > 0) {
                await this.subscriptionRepository.deleteMany({
                    id: { $in: gone },
                });
            }
        } catch (err: unknown) {
            this.logger.error(`push failed user=${userId}: ${String(err)}`);
        }
    }
}
