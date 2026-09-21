import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as IORedis } from 'ioredis';

/** True when Redis answered a ping at boot; false means the app is running in in-memory fallback mode. */
export const REDIS_AVAILABLE = Symbol('REDIS_AVAILABLE');

const logger = new Logger('RedisAvailability');

/**
 * One-shot connectivity check, run once at boot. Not re-checked afterwards —
 * a Redis outage after a healthy boot is out of scope (see the Redis
 * simplification plan); this only decides which mode the process starts in.
 *
 * Probes the `redis.queue` config, not `redis.cached` — today both are
 * populated from the same env vars (see configs/redis.config.ts), so this
 * result also gates the cache fallback. If those two are ever split onto
 * different Redis instances, this probe needs to check both.
 */
export async function probeRedisAvailability(
    configService: ConfigService
): Promise<boolean> {
    const client = new IORedis({
        host: configService.get<string>('redis.queue.host'),
        port: configService.get<number>('redis.queue.port'),
        username: configService.get<string>('redis.queue.username'),
        password: configService.get<string>('redis.queue.password'),
        tls: configService.get<boolean>('redis.queue.tls') ? {} : undefined,
        family: 0,
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null, // one attempt only — no retry storm on a dead host
    });

    try {
        await client.connect();
        await client.ping();
        return true;
    } catch (error) {
        logger.warn(
            `Redis unreachable at boot — starting in in-memory fallback mode: ${error}`
        );
        return false;
    } finally {
        client.disconnect();
    }
}
