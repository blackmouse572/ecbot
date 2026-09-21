import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { InjectQueue } from '@nestjs/bullmq';
import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { INBOUND_EVENT_QUEUE } from '../constants/inbound-event.constant';

const KEY_PREFIX = 'channel-rate';

// Bounds worst-case memory in fallback mode — a caller that stops sending
// requests would otherwise leave its window entry in `inMemoryWindows` forever.
const IN_MEMORY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

interface InMemoryWindow {
    count: number;
    expiresAt: number;
}

/**
 * Fixed-window request counter for the eccho-issued channels, keyed by whatever
 * identifies the caller — a ClientCredential for the API channel, a visitor
 * session for the widget.
 *
 * The global `@Throttle` guard cannot do this job: it counts in-process memory,
 * so the real limit multiplies by the number of pods, and it keys on IP, which
 * collapses to the load balancer's address for widget traffic. This counts in
 * Redis, shared across pods, keyed on the caller's own identity — unless Redis
 * was unreachable at boot, in which case it falls back to per-instance
 * in-memory counting (a known, accepted degradation for single-instance
 * deployments — the same tradeoff this service exists to avoid multi-pod).
 */
@Injectable()
export class ChannelRateLimitService implements OnModuleDestroy {
    private readonly logger = new Logger(ChannelRateLimitService.name);
    private readonly inMemoryWindows = new Map<string, InMemoryWindow>();
    private readonly sweepTimer?: NodeJS.Timeout;

    constructor(
        // Borrowed for its Redis connection only — nothing is enqueued here.
        @InjectQueue(INBOUND_EVENT_QUEUE) private readonly queue: Queue,
        @Inject(REDIS_AVAILABLE) private readonly redisAvailable: boolean
    ) {
        if (!redisAvailable) {
            this.sweepTimer = setInterval(
                () => this.sweepExpiredWindows(),
                IN_MEMORY_SWEEP_INTERVAL_MS
            ).unref();
        }
    }

    onModuleDestroy(): void {
        clearInterval(this.sweepTimer);
    }

    private sweepExpiredWindows(): void {
        const now = Date.now();
        for (const [key, window] of this.inMemoryWindows) {
            if (window.expiresAt <= now) this.inMemoryWindows.delete(key);
        }
    }

    // BullMQ narrows the client type; the runtime instance is ioredis with the
    // full Redis API. Centralised here so the cast appears once.
    private async redisClient(): Promise<{
        incr(key: string): Promise<number>;
        expire(key: string, seconds: number): Promise<number>;
    }> {
        return (await this.queue.client) as unknown as {
            incr(key: string): Promise<number>;
            expire(key: string, seconds: number): Promise<number>;
        };
    }

    /**
     * Consume one unit of `identity`'s budget. Returns false once the window is
     * exhausted.
     *
     * INCR-then-set-TTL is atomic on the counter, so parallel requests can't
     * both read the same pre-increment value and slip past the limit — the
     * read-modify-write the preview session service uses can.
     */
    async claim(
        identity: string,
        limit: number,
        windowSeconds: number
    ): Promise<boolean> {
        const key = `${KEY_PREFIX}:${identity}`;

        if (!this.redisAvailable) {
            return this.claimInMemory(key, limit, windowSeconds);
        }

        try {
            const client = await this.redisClient();
            const used = await client.incr(key);
            // Only the call that created the counter sets the expiry, so the
            // window is fixed rather than sliding forward on every request.
            if (used === 1) await client.expire(key, windowSeconds);
            return used <= limit;
        } catch (error) {
            // A rate limiter that hard-fails takes the channel down with it.
            // Losing the ceiling for the duration of a Redis outage is the
            // better failure.
            this.logger.error(
                `Rate limit check failed for ${identity}, allowing: ${error}`
            );
            return true;
        }
    }

    private claimInMemory(
        key: string,
        limit: number,
        windowSeconds: number
    ): boolean {
        const now = Date.now();
        const window = this.inMemoryWindows.get(key);
        if (!window || window.expiresAt <= now) {
            this.inMemoryWindows.set(key, {
                count: 1,
                expiresAt: now + windowSeconds * 1000,
            });
            return true;
        }
        window.count += 1;
        return window.count <= limit;
    }
}
