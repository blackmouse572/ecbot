import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { RedisConnectionProvider } from '@app/common/redis/redis-connection.provider';
import { Inject, Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

/**
 * Pings Redis over the shared RedisConnectionProvider client (no extra
 * connection). A healthy ping means inbound dedupe, the channel rate limit
 * and the generation lease can reach Redis, the readiness signal a load
 * balancer gates rolling deploys on (#129).
 *
 * When the instance intentionally booted without Redis (in-memory fallback
 * mode), reports healthy without pinging — that instance was never going to
 * see Redis, so treating it as perpetually not-ready would block every
 * rolling deploy instead of reflecting a one-time, known degradation.
 */
@Injectable()
export class HealthRedisIndicator {
    constructor(
        private readonly redis: RedisConnectionProvider,
        private readonly healthIndicatorService: HealthIndicatorService,
        @Inject(REDIS_AVAILABLE)
        private readonly redisAvailable: boolean
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!this.redisAvailable) {
            return indicator.up({ mode: 'in-memory-fallback' });
        }

        try {
            const pong: string = await this.redis.client.ping();

            if (pong !== 'PONG') {
                return indicator.down(
                    `HealthRedisIndicator Failed - unexpected ping reply: ${pong}`
                );
            }

            return indicator.up();
        } catch (err: any) {
            return indicator.down(
                `HealthRedisIndicator Failed - ${err?.message}`
            );
        }
    }
}
