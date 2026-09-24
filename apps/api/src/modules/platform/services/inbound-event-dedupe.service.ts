import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INBOUND_EVENT_QUEUE } from '../constants/inbound-event.constant';
import {
    INBOUND_EVENT_DEDUPE_KEY_PREFIX,
    INBOUND_EVENT_DEDUPE_TTL_SECONDS,
} from '../constants/inbound-event-dedupe.constant';

// Bounds worst-case memory in fallback mode — unclaimed entries (the common
// case: most messages are never redelivered) would otherwise sit in
// `inMemoryClaims` forever.
const IN_MEMORY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * The single shared dedupe seam for inbound platform events (candidate 1,
 * architecture review 2026-08-06). Backed by an atomic Redis SET NX
 * (reusing the inbound event queue's ioredis client, same as
 * GenerationLeaseService) — or an in-process Map when Redis was unreachable
 * at boot (single-instance-only correctness, same caveat as elsewhere in the
 * fallback mode).
 */
@Injectable()
export class InboundEventDedupeService implements OnModuleDestroy {
    private readonly inMemoryClaims = new Map<string, number>();
    private readonly sweepTimer?: NodeJS.Timeout;

    constructor(
        @InjectQueue(INBOUND_EVENT_QUEUE)
        private readonly queue: Queue,
        @Inject(REDIS_AVAILABLE)
        private readonly redisAvailable: boolean
    ) {
        if (!redisAvailable) {
            this.sweepTimer = setInterval(
                () => this.sweepExpiredClaims(),
                IN_MEMORY_SWEEP_INTERVAL_MS
            ).unref();
        }
    }

    onModuleDestroy(): void {
        clearInterval(this.sweepTimer);
    }

    private sweepExpiredClaims(): void {
        const now = Date.now();
        for (const [key, expiresAt] of this.inMemoryClaims) {
            if (expiresAt <= now) this.inMemoryClaims.delete(key);
        }
    }

    private key(platform: string, externalMessageId: string): string {
        return `${INBOUND_EVENT_DEDUPE_KEY_PREFIX}:${platform}:${externalMessageId}`;
    }

    private async client(): Promise<{
        set(
            key: string,
            value: string,
            ex: 'EX',
            ttl: number,
            nx: 'NX'
        ): Promise<'OK' | null>;
        del(key: string): Promise<number>;
    }> {
        return (await this.queue.getBackend().client) as unknown as {
            set(
                key: string,
                value: string,
                ex: 'EX',
                ttl: number,
                nx: 'NX'
            ): Promise<'OK' | null>;
            del(key: string): Promise<number>;
        };
    }

    /**
     * True the first time this (platform, externalMessageId) pair is seen;
     * false on redelivery — callers must skip all downstream side effects.
     */
    async claim(platform: string, externalMessageId: string): Promise<boolean> {
        const key = this.key(platform, externalMessageId);

        if (!this.redisAvailable) {
            const now = Date.now();
            const expiresAt = this.inMemoryClaims.get(key);
            if (expiresAt && expiresAt > now) return false;
            this.inMemoryClaims.set(
                key,
                now + INBOUND_EVENT_DEDUPE_TTL_SECONDS * 1000
            );
            return true;
        }

        const client = await this.client();
        const result = await client.set(
            key,
            '1',
            'EX',
            INBOUND_EVENT_DEDUPE_TTL_SECONDS,
            'NX'
        );
        return result === 'OK';
    }

    /**
     * Drop the claim so the pair can be claimed again. Called when the Turn
     * that holds the claim fails: without it the BullMQ retry reads the claim
     * as a platform redelivery and skips the message for good.
     */
    async release(platform: string, externalMessageId: string): Promise<void> {
        const key = this.key(platform, externalMessageId);

        if (!this.redisAvailable) {
            this.inMemoryClaims.delete(key);
            return;
        }

        const client = await this.client();
        await client.del(key);
    }
}
