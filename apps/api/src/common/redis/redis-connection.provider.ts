import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as IORedis } from 'ioredis';
import { REDIS_AVAILABLE } from './redis-availability.provider';

const logger = new Logger('RedisConnection');

/**
 * Shared ioredis client for the plain-command Redis helpers (inbound dedupe,
 * channel rate limit, generation lease) and the health ping. Nothing polls
 * it: with no traffic it sends no commands, so pay-per-command Redis
 * (Upstash) only bills per message. Quit on shutdown.
 */
@Injectable()
export class RedisConnectionProvider implements OnModuleDestroy {
    readonly client: IORedis;

    constructor(
        configService: ConfigService,
        @Inject(REDIS_AVAILABLE) redisAvailable: boolean
    ) {
        this.client = new IORedis({
            host: configService.get<string>('redis.queue.host'),
            port: configService.get<number>('redis.queue.port'),
            username: configService.get<string>('redis.queue.username'),
            password: configService.get<string>('redis.queue.password'),
            tls: configService.get<boolean>('redis.queue.tls') ? {} : undefined,
            family: 0, // Test on railways (https://docs.railway.com/reference/errors/enotfound-redis-railway-internal)
            // Already known unreachable at boot (REDIS_AVAILABLE probed
            // first): every helper is on its in-memory fallback, so stop
            // ioredis from reconnect-looping forever.
            retryStrategy: redisAvailable ? undefined : () => null,
        });

        // Without a listener, ioredis falls back to its own raw
        // `console.error('[ioredis] Unhandled error event:', err.stack)`
        // and the connection error can surface as an unhandled
        // rejection elsewhere (e.g. an in-flight command rejected on
        // shutdown) — bounded, structured log instead.
        this.client.on('error', (error: NodeJS.ErrnoException) => {
            logger.warn(
                `Redis connection error (${error.code ?? 'unknown'}): ${error.message}`
            );
        });
    }

    async onModuleDestroy(): Promise<void> {
        // quit() only completes on a live connection: while reconnecting it
        // sits in the offline queue forever (retries are unbounded), and on
        // an ended one it rejects. disconnect() is the honest close there.
        if (this.client.status !== 'ready') {
            this.client.disconnect();
            return;
        }
        await this.client.quit().catch(() => this.client.disconnect());
    }
}
