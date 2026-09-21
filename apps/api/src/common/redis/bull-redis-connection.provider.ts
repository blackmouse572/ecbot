import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as IORedis } from 'ioredis';
import { REDIS_AVAILABLE } from './redis-availability.provider';

const logger = new Logger('BullRedisConnection');

/**
 * Shared ioredis client for every BullMQ Queue/Worker. `quit()` here runs in
 * `onModuleDestroy`, before `@nestjs/bullmq` closes Queues/Workers in
 * `onApplicationShutdown` — safe because BullMQ treats an injected ioredis
 * instance as shared and never quits it from `.close()` (a Worker's blocking connection is its own `.duplicate()`).
 */
@Injectable()
export class BullRedisConnectionProvider implements OnModuleDestroy {
    readonly client: IORedis;

    constructor(
        configService: ConfigService,
        @Inject(REDIS_AVAILABLE) redisAvailable: boolean
    ) {
        // Pass a single shared ioredis instance (not an options object).
        // With an options object BullMQ spins up a fresh connection per
        // Queue AND per Worker; sharing one instance collapses all the
        // queue-producer connections into one (workers still .duplicate()
        // for their blocking reads). Cuts ~6 Redis connections/instance —
        // matters on connection-capped Redis tiers. maxRetriesPerRequest
        // must be null for BullMQ when the connection is provided.
        this.client = new IORedis({
            host: configService.get<string>('redis.queue.host'),
            port: configService.get<number>('redis.queue.port'),
            username: configService.get<string>('redis.queue.username'),
            password: configService.get<string>('redis.queue.password'),
            tls: configService.get<boolean>('redis.queue.tls') ? {} : undefined,
            family: 0, // Test on railways (https://docs.railway.com/reference/errors/enotfound-redis-railway-internal)
            maxRetriesPerRequest: null,
            // Already known unreachable at boot (REDIS_AVAILABLE probed
            // first) — stop ioredis from reconnect-looping forever.
            // InboundEventProcessor's Worker still exists (other
            // services borrow this connection), it just never gets a
            // job in fallback mode, so there's nothing to keep
            // reconnecting for.
            retryStrategy: redisAvailable ? undefined : () => null,
        });

        // Without a listener, ioredis falls back to its own raw
        // `console.error('[ioredis] Unhandled error event:', err.stack)`
        // and the connection error can surface as an unhandled
        // rejection elsewhere (e.g. an in-flight command rejected on
        // shutdown) — bounded, structured log instead.
        this.client.on('error', (error: NodeJS.ErrnoException) => {
            logger.warn(
                `BullMQ Redis connection error (${error.code ?? 'unknown'}): ${error.message}`
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
