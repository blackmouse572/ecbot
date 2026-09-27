import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INBOUND_EVENT_QUEUE } from '../constants/inbound-event.constant';
import {
    GENERATION_LEASE_KEY_PREFIX,
    GENERATION_LEASE_TTL_SECONDS,
} from '../constants/generation-lease.constant';

// Bounds worst-case memory in fallback mode — a conversation that goes quiet
// would otherwise leave its epoch entry in `inMemoryEpochs` forever.
const IN_MEMORY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Per-conversation generation lease. Backed by an atomic Redis counter
 * (reusing the inbound event queue's ioredis client) — or, when Redis was
 * unreachable at boot, an in-process Map (correct only for a single
 * instance, same caveat as MessageDebounceService's in-memory path).
 * `bump` is called on every inbound message; a reply generation captures
 * `current` at its start and re-checks it — if it has moved, a newer message
 * arrived and the generation is superseded (abort + discard rather than send
 * a stale reply).
 */
@Injectable()
export class GenerationLeaseService implements OnModuleDestroy {
    private readonly inMemoryEpochs = new Map<
        string,
        { epoch: number; expiresAt: number }
    >();
    private readonly sweepTimer?: NodeJS.Timeout;

    constructor(
        @InjectQueue(INBOUND_EVENT_QUEUE)
        private readonly queue: Queue,
        @Inject(REDIS_AVAILABLE)
        private readonly redisAvailable: boolean
    ) {
        if (!redisAvailable) {
            this.sweepTimer = setInterval(
                () => this.sweepExpiredEpochs(),
                IN_MEMORY_SWEEP_INTERVAL_MS
            ).unref();
        }
    }

    onModuleDestroy(): void {
        clearInterval(this.sweepTimer);
    }

    private sweepExpiredEpochs(): void {
        const now = Date.now();
        for (const [key, value] of this.inMemoryEpochs) {
            if (value.expiresAt <= now) this.inMemoryEpochs.delete(key);
        }
    }

    private key(conversationId: string): string {
        return `${GENERATION_LEASE_KEY_PREFIX}:${conversationId}`;
    }

    private async client(): Promise<{
        incr(key: string): Promise<number>;
        expire(key: string, seconds: number): Promise<number>;
        get(key: string): Promise<string | null>;
    }> {
        return (await this.queue.getBackend().client) as unknown as {
            incr(key: string): Promise<number>;
            expire(key: string, seconds: number): Promise<number>;
            get(key: string): Promise<string | null>;
        };
    }

    /** Advance the epoch (new inbound message). Returns the new epoch. */
    async bump(conversationId: string): Promise<number> {
        if (!this.redisAvailable) return this.bumpInMemory(conversationId);

        const client = await this.client();
        const epoch = await client.incr(this.key(conversationId));
        await client.expire(
            this.key(conversationId),
            GENERATION_LEASE_TTL_SECONDS
        );
        return epoch;
    }

    /** Current epoch (0 if none yet). */
    async current(conversationId: string): Promise<number> {
        if (!this.redisAvailable) return this.currentInMemory(conversationId);

        const client = await this.client();
        const raw = await client.get(this.key(conversationId));
        return raw ? Number(raw) : 0;
    }

    /** True while `epoch` is still the newest — i.e. no newer message arrived. */
    async isCurrent(conversationId: string, epoch: number): Promise<boolean> {
        return (await this.current(conversationId)) === epoch;
    }

    private bumpInMemory(conversationId: string): number {
        const now = Date.now();
        const existing = this.inMemoryEpochs.get(conversationId);
        const epoch =
            existing && existing.expiresAt > now ? existing.epoch + 1 : 1;
        this.inMemoryEpochs.set(conversationId, {
            epoch,
            expiresAt: now + GENERATION_LEASE_TTL_SECONDS * 1000,
        });
        return epoch;
    }

    private currentInMemory(conversationId: string): number {
        const existing = this.inMemoryEpochs.get(conversationId);
        if (!existing || existing.expiresAt <= Date.now()) return 0;
        return existing.epoch;
    }
}
