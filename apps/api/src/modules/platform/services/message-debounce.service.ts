import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MESSAGE_DEBOUNCE_MS } from '../constants/message-debounce.constant';
import { GenerationLeaseService } from './generation-lease.service';
import { ReplyGenerationService } from './reply-generation.service';

interface PendingBurst {
    /** The burst's messages in order; `messageId` is the saved row (a message
     *  without an external id has none). */
    entries: { text: string; messageId?: string }[];
    senderId: string;
    customerId: string;
    contactPointId: string;
    timer?: NodeJS.Timeout;
}

/**
 * Coalesces a burst of rapid inbound messages into one AI reply. In-process
 * only (a plain Map + setTimeout) — correct for a single instance, which is
 * why it's the fallback path only: MessageProcessorService routes to the edge
 * Worker's Durable Object instead whenever POC_EDGE_DEBOUNCE_URL is set,
 * which is how multi-instance deployments (prod/staging today) get the same
 * per-conversation debounce without needing Redis/BullMQ here.
 *
 * One reply runs per conversation at a time. A message that arrives while
 * one runs is held: the running turn may steer it in (apps/ai), and whatever
 * it did not take gets a follow-up reply right after.
 *
 * A restart mid-window drops whatever is buffered — no persistence, unlike
 * the old BullMQ-backed version. Acceptable here (local dev only, matches the
 * same tradeoff already accepted for the API-channel callback retry).
 */
@Injectable()
export class MessageDebounceService implements OnModuleDestroy {
    private readonly logger = new Logger(MessageDebounceService.name);
    private readonly pending = new Map<string, PendingBurst>();
    private readonly replying = new Set<string>();

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
        // Advance the generation lease: a reply in flight that has not run a
        // tool or sent anything yet is now superseded and discards itself.
        await this.lease.bump(conversationId);

        const burst = this.pending.get(conversationId) ?? {
            entries: [],
            senderId,
            customerId,
            contactPointId,
        };
        burst.entries.push({ text, messageId });
        burst.senderId = senderId;
        burst.customerId = customerId;
        burst.contactPointId = contactPointId;
        clearTimeout(burst.timer);
        burst.timer = this.replying.has(conversationId)
            ? undefined
            : this.scheduleFire(conversationId);
        this.pending.set(conversationId, burst);
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

        this.replying.add(conversationId);
        let steered: string[] = [];
        try {
            const outcome = await this.replyGeneration.run({
                conversationId,
                senderId: burst.senderId,
                customerId: burst.customerId,
                contactPointId: burst.contactPointId,
                texts: burst.entries.map(e => e.text),
                messageIds: burst.entries.flatMap(e =>
                    e.messageId ? [e.messageId] : []
                ),
            });
            steered = outcome?.steeredMessageIds ?? [];
        } finally {
            this.replying.delete(conversationId);
            this.followUp(conversationId, steered);
        }
    }

    /** Answer what arrived during the reply and was not steered into it. */
    private followUp(conversationId: string, steered: string[]): void {
        const held = this.pending.get(conversationId);
        if (!held) return;
        held.entries = held.entries.filter(
            e => !e.messageId || !steered.includes(e.messageId)
        );
        if (held.entries.length === 0) {
            this.pending.delete(conversationId);
            return;
        }
        held.timer = this.scheduleFire(conversationId);
    }
}
