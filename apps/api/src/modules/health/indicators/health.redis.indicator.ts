import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { INBOUND_EVENT_QUEUE } from 'src/modules/platform/constants/inbound-event.constant';

/**
 * Pings the Redis that backs BullMQ by reusing the Inbound Inbox queue's own
 * connection (no extra Redis connection). A healthy ping means the durable
 * inbox, dedupe, and every other BullMQ queue can reach Redis — the readiness
 * signal a load balancer gates rolling deploys on (#129 / ADR-0007).
 *
 * When the instance intentionally booted without Redis (in-memory fallback
 * mode), reports healthy without pinging — that instance was never going to
 * see Redis, so treating it as perpetually not-ready would block every
 * rolling deploy instead of reflecting a one-time, known degradation.
 */
@Injectable()
export class HealthRedisIndicator {
    constructor(
        @InjectQueue(INBOUND_EVENT_QUEUE)
        private readonly queue: Queue,
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
            // BullMQ's IRedisClient interface doesn't surface `ping`, but the
            // concrete client (ioredis) does.
            const client = (await this.queue.getBackend().client) as unknown as {
                ping(): Promise<string>;
            };
            const pong = await client.ping();

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
