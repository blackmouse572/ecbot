import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MESSAGE_DEBOUNCE_MS } from '../constants/message-debounce.constant';
import { GenerationLeaseService } from './generation-lease.service';
import { ReplyGenerationService } from './reply-generation.service';

interface PendingBurst {
    texts: string[];
    /** Saved rows of `texts` (a message without an external id has none). */
    messageIds: string[];
    senderId: string;
    customerId: string;
    contactPointId: string;
    timer: NodeJS.Timeout;
}

/**
 * Coalesces a burst of rapid inbound messages into one AI reply. In-process
 * only (a plain Map + setTimeout) — correct for a single instance, which is
 * why it's the fallback path only: MessageProcessorService routes to the edge
 * Worker's Durable Object instead whenever POC_EDGE_DEBOUNCE_URL is set,
 * which is how multi-instance deployments (prod/staging today) get the same
 * per-conversation debounce without needing Redis/BullMQ here.
 *
 * A restart mid-window drops whatever is buffered — no persistence, unlike
 * the old BullMQ-backed version. Acceptable here (local dev only, matches the
 * same tradeoff already accepted for the API-channel callback retry).
 */
@Injectable()
export class MessageDebounceService implements OnModuleDestroy {
    private readonly logger = new Logger(MessageDebounceService.name);
    private readonly pending = new Map<string, PendingBurst>();

    constructor(
        private readonly lease: GenerationLeaseService,
        private readonly replyGeneration: ReplyGenerationService
    ) {}

    onModuleDestroy(): void {
        for (const burst of this.pending.values()) clearTimeout(burst.timer);
        this.pending.clear();
    }

    async schedule(
        conversationId: string,
        senderId: string,
        customerId: string,
        contactPointId: string,
        text: string,
        messageId?: string
    ): Promise<void> {
        // Advance the generation lease: any reply generation already in flight
        // for this conversation is now superseded and will discard itself.
        await this.lease.bump(conversationId);

        const existing = this.pending.get(conversationId);
        if (existing) {
            clearTimeout(existing.timer);
            existing.texts.push(text);
            if (messageId) existing.messageIds.push(messageId);
            existing.senderId = senderId;
            existing.customerId = customerId;
            existing.contactPointId = contactPointId;
            existing.timer = this.scheduleFire(conversationId);
            return;
        }

        this.pending.set(conversationId, {
            texts: [text],
            messageIds: messageId ? [messageId] : [],
            senderId,
            customerId,
            contactPointId,
            timer: this.scheduleFire(conversationId),
        });
    }

    private scheduleFire(conversationId: string): NodeJS.Timeout {
        return setTimeout(() => {
            this.fire(conversationId).catch(err =>
                this.logger.warn(
                    `Debounce fire failed for ${conversationId}: ${err instanceof Error ? err.message : String(err)}`
                )
            );
        }, MESSAGE_DEBOUNCE_MS).unref();
    }

    private async fire(conversationId: string): Promise<void> {
        const burst = this.pending.get(conversationId);
        if (!burst) return;
        this.pending.delete(conversationId);

        await this.replyGeneration.run({
            conversationId,
            senderId: burst.senderId,
            customerId: burst.customerId,
            contactPointId: burst.contactPointId,
            texts: burst.texts,
            messageIds: burst.messageIds,
        });
    }
}
