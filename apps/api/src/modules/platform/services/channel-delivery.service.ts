import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformAdapter } from '../adapters/platform-adapter.base';
import {
    CHANNEL_FAILURE_THRESHOLD,
    CHANNEL_FAILURE_WINDOW_SECONDS,
    CHANNEL_HEALTH_KEY_PREFIX,
    ENUM_CHANNEL_ALERT,
    ENUM_SEND_FAILURE,
    SEND_RETRY_DELAYS_MS,
} from '../constants/channel-health.constant';
import {
    ISendGuard,
    PLATFORM_ADAPTER,
} from '../interfaces/platform-adapter.interface';
import { classifySendError } from '../utils/send-failure.util';
import { ChannelAlertService } from './channel-alert.service';
import { ChannelRateLimitService } from './channel-rate-limit.service';

/**
 * Wraps every platform send (bot replies, fallbacks, operator replies): resends
 * a failure that never reached the platform, and tells the workspace when a
 * channel stops delivering. Platforms take no idempotency key, so a failure
 * that may have landed (a timeout) is never resent.
 */
@Injectable()
export class ChannelDeliveryService implements ISendGuard, OnModuleInit {
    private readonly logger = new Logger(ChannelDeliveryService.name);

    constructor(
        @Inject(PLATFORM_ADAPTER)
        private readonly adapters: PlatformAdapter[],
        private readonly rateLimit: ChannelRateLimitService,
        private readonly alerts: ChannelAlertService
    ) {}

    onModuleInit(): void {
        for (const adapter of this.adapters) adapter.useSendGuard(this);
    }

    async run<T>(account: AccountEntity, send: () => Promise<T>): Promise<T> {
        for (let attempt = 0; ; attempt++) {
            try {
                const result = await send();
                await this.recordSuccess(account);
                return result;
            } catch (err: unknown) {
                const kind = classifySendError(err);
                if (
                    kind === ENUM_SEND_FAILURE.TRANSIENT &&
                    attempt < SEND_RETRY_DELAYS_MS.length
                ) {
                    await this.sleep(SEND_RETRY_DELAYS_MS[attempt]);
                    continue;
                }
                await this.recordFailure(account, kind, err);
                throw err;
            }
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private failKey(account: AccountEntity): string {
        return `${CHANNEL_HEALTH_KEY_PREFIX}:fail:${account.id}`;
    }

    // Health bookkeeping never fails the send it describes.
    private async recordSuccess(account: AccountEntity): Promise<void> {
        try {
            await this.rateLimit.reset(this.failKey(account));
            if (account.sendFailingSince) await this.alerts.recovered(account);
        } catch (err: unknown) {
            this.logger.warn(
                `channel health success not recorded account=${account.id}: ${String(err)}`
            );
        }
    }

    private async recordFailure(
        account: AccountEntity,
        kind: ENUM_SEND_FAILURE,
        err: unknown
    ): Promise<void> {
        try {
            if (kind === ENUM_SEND_FAILURE.RECIPIENT) return;
            if (kind === ENUM_SEND_FAILURE.AUTH) {
                await this.alerts.open(
                    account,
                    ENUM_CHANNEL_ALERT.AUTH_FAILED,
                    err
                );
                return;
            }
            const belowThreshold = await this.rateLimit.claim(
                this.failKey(account),
                CHANNEL_FAILURE_THRESHOLD - 1,
                CHANNEL_FAILURE_WINDOW_SECONDS
            );
            if (!belowThreshold) {
                await this.alerts.open(
                    account,
                    ENUM_CHANNEL_ALERT.SEND_FAILING,
                    err
                );
            }
        } catch (alertErr: unknown) {
            this.logger.warn(
                `channel health failure not recorded account=${account.id}: ${String(alertErr)}`
            );
        }
    }
}
