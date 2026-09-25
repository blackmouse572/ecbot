import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { ChatbotAIService } from '@app/modules/chatbot/services/chatbot-ai.service';
import { ENUM_CONVERSATION_STATUS } from '@app/modules/conversation/enums/conversation.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ConversationService } from '@app/modules/conversation/services/conversation.service';
import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';
import { MESSAGE_MEDIA_MAX_BYTES } from '@app/modules/conversation/constants/message-media.constant';
import { CustomerService } from '@app/modules/customer/services/customer.service';
import { CustomerTagClassifierService } from '@app/modules/customer/services/customer-tag-classifier.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
    PlatformAttachment,
    PlatformWebhookEvent,
} from '../interfaces/platform-adapter.interface';
import { PlatformAdapter } from '../adapters/platform-adapter.base';
import { hasImage } from '../interfaces/message-model';
import { PlatformAdapterRegistry } from './platform-adapter.registry';
import { fetchAsBase64 } from '@app/common/utils/fetch-as-base64.util';
import { MessageDebounceService } from './message-debounce.service';
import { ActionRouter } from './action-router.service';
import { GenerationLeaseService } from './generation-lease.service';
import { InboundEventDedupeService } from './inbound-event-dedupe.service';

@Injectable()
export class MessageProcessorService implements OnModuleInit {
    private readonly logger = new Logger(MessageProcessorService.name);

    // Resolved lazily via ModuleRef (see onModuleInit) rather than injected
    // through the constructor, to avoid a PlatformModule <-> ConversationModule
    // forwardRef cycle (see #211). Kept as a plain field (not a getter) so it
    // stays a normal, overridable instance property for unit tests.
    private conversationService: ConversationService;

    constructor(
        private readonly accountService: AccountService,
        private readonly messageRepository: MessageRepository,
        private readonly registry: PlatformAdapterRegistry,
        private readonly customerService: CustomerService,
        private readonly customerTagClassifierService: CustomerTagClassifierService,
        private readonly messageDebounceService: MessageDebounceService,
        private readonly actionRouter: ActionRouter,
        private readonly moduleRef: ModuleRef,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly lease: GenerationLeaseService,
        private readonly dedupe: InboundEventDedupeService,
        private readonly messageMedia: MessageMediaService
    ) {}

    onModuleInit(): void {
        this.conversationService = this.moduleRef.get(ConversationService, {
            strict: false,
        });
    }

    async process(event: PlatformWebhookEvent): Promise<void> {
        if (event.kind === 'reaction' && event.reaction) {
            await this.processReaction(
                event.accountKey,
                event.senderId,
                event.reaction
            );
            return;
        }

        if (event.kind === 'echo') {
            await this.processEcho(event);
            return;
        }

        // Allow action events (postback/quick_reply) through even when kind != 'message'
        if (event.kind !== 'message' && !event.action) return;
        // An image with no caption is still a customer turn (the AI describes it).
        if (!event.text && !event.action && !hasImage(event.attachments))
            return;

        const account = await this.accountService.findOne(
            { externalId: event.accountKey },
            { populate: ['chatbot', 'chatbot.workspace'] } as any
        );
        if (!account) {
            this.logger.warn(`No account for externalId=${event.accountKey}`);
            return;
        }
        if (!account.chatbot) {
            this.logger.debug(
                `Account ${account.id} has no chatbot — skipping`
            );
            return;
        }

        // Shared dedupe seam (candidate 1) — same key shape as the BullMQ
        // job id (${platform}-${externalMessageId}, ADR-0007), but checked
        // here so it covers BOTH ingress paths: the BullMQ-drained
        // direct-to-api path (where it's redundant defense-in-depth) and the
        // edge-forwarded path (where it's the only dedupe there is). A
        // redelivery of the same event is a no-op — no side effect below
        // this point may run twice.
        if (event.externalMessageId) {
            const claimed = await this.dedupe.claim(
                account.type,
                event.externalMessageId
            );
            if (!claimed) {
                this.logger.debug(
                    `Duplicate inbound event skipped: platform=${account.type} mid=${event.externalMessageId}`
                );
                return;
            }
        }

        try {
            await this.runTurn(event, account);
        } catch (err) {
            // The claim above marks "this Turn ran". If the Turn throws, the
            // BullMQ retry would read that claim as a platform redelivery and
            // skip the message for good — one transient failure would lose it
            // permanently. Release the claim so the retry actually reruns.
            if (event.externalMessageId) {
                await this.dedupe.release(
                    account.type,
                    event.externalMessageId
                );
            }
            this.logger.error(
                `Inbound turn failed: platform=${account.type} mid=${event.externalMessageId}: ${(err as Error).message}`
            );
            throw err;
        }
    }

    /** The Turn itself: everything past the intake guards and dedupe claim. */
    private async runTurn(
        event: PlatformWebhookEvent,
        account: AccountEntity
    ): Promise<void> {
        const chatbot = account.chatbot;
        const adapter = this.registry.get(account.type);
        const workspaceId = chatbot.workspace.id;

        const { contactPoint, customerId } =
            await this.customerService.resolveContactPoint({
                workspaceId,
                platform: account.type,
                externalSenderId: event.senderId,
            });

        const conversation = await this.conversationService.findOrCreate({
            chatbotId: chatbot.id,
            accountId: account.id,
            senderId: event.senderId,
            contactPointId: contactPoint.id,
        });

        // For action events (postback/quick_reply), use the action value as the
        // effective message text so persistence + debounce work unchanged.
        const effectiveText = event.action?.value ?? event.text ?? '';

        // Dispatch to a registered handler first; if handled, stop here.
        if (event.action) {
            const handled = await this.actionRouter.dispatch(event.action.id, {
                conversationId: conversation.id,
                senderId: event.senderId,
                value: event.action.value,
            });
            if (handled) return;
        }

        const STALE_MS = 7 * 24 * 60 * 60 * 1000;
        const isStale =
            !conversation.senderProfileFetchedAt ||
            Date.now() - conversation.senderProfileFetchedAt.getTime() >
                STALE_MS;

        if (isStale) {
            try {
                const profile = await adapter.fetchSenderProfile(
                    account,
                    event.senderId
                );
                const senderName = profile.name ?? event.senderName;
                const avatarBase64 = profile.avatar
                    ? await fetchAsBase64(profile.avatar)
                    : undefined;
                const fetchedAt = new Date();
                await this.conversationService.updateSenderProfile(
                    conversation.id,
                    {
                        senderName,
                        senderAvatar: avatarBase64 ?? null,
                        senderProfileFetchedAt: fetchedAt,
                    }
                );
                await this.customerService.updateContactPointProfile(
                    contactPoint.id,
                    {
                        displaySenderName: senderName,
                        senderAvatar: avatarBase64 ?? null,
                        fetchedAt,
                    }
                );
                await this.customerService.fillCustomerNameIfEmpty(
                    customerId,
                    senderName
                );
                conversation.senderName = senderName;
                conversation.senderAvatar = avatarBase64 ?? null;
                conversation.senderProfileFetchedAt = fetchedAt;
            } catch (e) {
                this.logger.warn(
                    `fetchSenderProfile failed for account=${account.type} sender=${event.senderId}: ${(e as Error).message}`
                );
            }
        }

        if (event.externalMessageId) {
            await this.messageRepository.upsertByExternalId(
                conversation.id,
                event.externalMessageId,
                {
                    direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                    authorType: ENUM_MESSAGE_AUTHOR.USER,
                    authorId: event.senderId,
                    text: effectiveText,
                    attachments: await this.storeAttachments(
                        adapter,
                        account,
                        conversation.id,
                        event.attachments
                    ),
                    raw: event.raw,
                    dateSent: event.timestamp,
                }
            );
        }

        await this.conversationService.touchLastMessage(
            chatbot.id,
            account.id,
            event.senderId
        );

        this.customerTagClassifierService
            .scheduleAfterMessage(conversation.id, new Date())
            .catch(err =>
                this.logger.warn(
                    `scheduleAfterMessage failed for ${conversation.id}: ${err.message}`
                )
            );

        await this.resumeBotIfResolved(conversation);

        if (!conversation.botEnabled) {
            this.logger.debug(
                `Conversation ${conversation.id} bot disabled — skipping bot reply`
            );
            return;
        }

        if (
            this.conversationService.detectHandoffKeywords(
                effectiveText,
                chatbot.handoffKeywords ?? []
            )
        ) {
            this.logger.log(
                `Handoff keyword detected in conversation ${conversation.id}`
            );
            await this.conversationService.triggerHandoff(
                conversation,
                chatbot.workspace.id,
                'keyword_trigger',
                chatbot.handoffMessage
            );
            return;
        }

        if (chatbot.autoRead) {
            adapter.markRead(account, event.senderId).catch(() => {});
        }

        // Start typing here rather than waiting for ReplyGenerationService: the
        // inbound leg (webhook -> queue -> debounce) is several seconds on its
        // own, and starting only at generation time left the thread visibly
        // dead for all of it. Safe at this point — bot-disabled and handoff both
        // returned above, so a reply really is coming. ReplyGenerationService
        // still owns the refresh interval and stopTyping().
        if (chatbot.typingIndicator) {
            adapter.startTyping(account, event.senderId, true).catch(() => {});
        }

        if (process.env.POC_EDGE_DEBOUNCE_URL) {
            // POC: the burst buffer + debounce timer now live in the edge
            // Durable Object. Bump the Redis lease here (same supersede
            // semantics as messageDebounceService.schedule) then hand the
            // message off to the edge Worker instead of enqueuing BullMQ.
            // Resilient like the flag-OFF path below: a Redis hiccup must not
            // throw out of process() and abort the rest of the webhook batch.
            await this.lease
                .bump(conversation.id)
                .catch(err =>
                    this.logger.warn(
                        `lease.bump failed for ${conversation.id}: ${err.message}`
                    )
                );
            await fetch(
                `${process.env.POC_EDGE_DEBOUNCE_URL}/internal/debounce`,
                {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-internal-secret':
                            process.env.POC_EDGE_INTERNAL_SECRET ?? '',
                    },
                    body: JSON.stringify({
                        conversationId: conversation.id,
                        senderId: event.senderId,
                        customerId,
                        contactPointId: contactPoint.id,
                        text: effectiveText,
                    }),
                }
            ).catch(err =>
                this.logger.warn(
                    `edge debounce POST failed for ${conversation.id}: ${err.message}`
                )
            );
        } else {
            this.messageDebounceService
                .schedule(
                    conversation.id,
                    event.senderId,
                    customerId,
                    contactPoint.id,
                    effectiveText
                )
                .catch(err =>
                    this.logger.warn(
                        `messageDebounce.schedule failed for ${conversation.id}: ${err.message}`
                    )
                );
        }
    }

    /**
     * Copy each image into our own storage: platform links expire or need
     * credentials. On any failure the image keeps its platform link, so the
     * turn still goes through. The platform `raw` payload is not kept here —
     * it already lives on the message's `raw`.
     */
    private async storeAttachments(
        adapter: PlatformAdapter,
        account: AccountEntity,
        conversationId: string,
        attachments?: PlatformAttachment[]
    ): Promise<unknown[] | undefined> {
        if (!attachments?.length) return undefined;
        return Promise.all(
            attachments.map(async ({ type, url, raw }) => {
                const kept = url ? { type, url } : { type };
                if (type !== 'image') return kept;
                try {
                    const media = await adapter.fetchMedia(account, {
                        type,
                        url,
                        raw,
                    });
                    if (
                        !media?.mime.startsWith('image/') ||
                        media.data.length > MESSAGE_MEDIA_MAX_BYTES
                    )
                        return kept;
                    return await this.messageMedia.saveImage(
                        conversationId,
                        media
                    );
                } catch (err) {
                    this.logger.warn(
                        `Storing inbound image failed for ${conversationId}: ${(err as Error).message}`
                    );
                    return kept;
                }
            })
        );
    }

    /**
     * Persist what the page said. Echoes carry an operator's reply typed in
     * the platform's own inbox, or history replayed by adapter.reconcile();
     * either way it belongs in the thread as an outbound message. Stored, and
     * nothing more — an echo is not a customer turn, so no debounce, no lease
     * bump, no reply.
     *
     * Skips echoes of our own sends: ReplyGenerationService already wrote
     * those at send time under the same externalId, so persisting again would
     * race that write for the (conversation, externalId) unique index.
     */
    private async processEcho(event: PlatformWebhookEvent): Promise<void> {
        if (event.sentByUs) {
            this.logger.debug(
                `Echo skipped (our own send): mid=${event.externalMessageId}`
            );
            return;
        }
        if (!event.text || !event.externalMessageId) {
            this.logger.debug(
                `Echo skipped (no text or id): mid=${event.externalMessageId}`
            );
            return;
        }

        const account = await this.accountService.findOne(
            { externalId: event.accountKey },
            { populate: ['chatbot', 'chatbot.workspace'] } as any
        );
        if (!account?.chatbot) return;

        const { contactPoint } = await this.customerService.resolveContactPoint(
            {
                workspaceId: account.chatbot.workspace.id,
                platform: account.type,
                externalSenderId: event.senderId,
            }
        );

        const conversation = await this.conversationService.findOrCreate({
            chatbotId: account.chatbot.id,
            accountId: account.id,
            senderId: event.senderId,
            contactPointId: contactPoint.id,
        });

        await this.messageRepository.upsertByExternalId(
            conversation.id,
            event.externalMessageId,
            {
                direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                authorId: event.recipientId,
                text: event.text,
                raw: event.raw,
                dateSent: event.timestamp,
            }
        );
    }

    /**
     * Persist an inbound reaction. Resolves the conversation the exact same
     * way the message branch of `process()` does (account → chatbot →
     * contact point → findOrCreate), then applies the reaction to the
     * message it targets. A miss (message not yet stored, e.g. reaction on
     * something older than our retention or received out of order) is a
     * silent no-op — there is nothing to attach the reaction to.
     */
    private async processReaction(
        accountKey: string,
        senderId: string,
        reaction: NonNullable<PlatformWebhookEvent['reaction']>
    ): Promise<void> {
        const account = await this.accountService.findOne(
            { externalId: accountKey },
            { populate: ['chatbot', 'chatbot.workspace'] } as any
        );
        if (!account) {
            this.logger.warn(`No account for externalId=${accountKey}`);
            return;
        }
        if (!account.chatbot) {
            this.logger.debug(
                `Account ${account.id} has no chatbot — skipping reaction`
            );
            return;
        }

        const chatbot = account.chatbot;
        const workspaceId = chatbot.workspace.id;

        const { contactPoint } = await this.customerService.resolveContactPoint(
            {
                workspaceId,
                platform: account.type,
                externalSenderId: senderId,
            }
        );

        const conversation = await this.conversationService.findOrCreate({
            chatbotId: chatbot.id,
            accountId: account.id,
            senderId,
            contactPointId: contactPoint.id,
        });

        const message = await this.messageRepository.applyReaction(
            conversation.id,
            reaction.messageId,
            {
                emoji: reaction.emoji,
                actorType: 'customer',
                actorId: senderId,
                action: reaction.action,
            }
        );

        if (!message) {
            this.logger.debug(
                `Reaction target message not found: conversation=${conversation.id} externalId=${reaction.messageId}`
            );
        }
    }

    /**
     * A resolved conversation receiving a new inbound message re-opens for the
     * bot. Reseed-on-resume: clear the AI checkpointer thread so the next turn
     * rebuilds full history from the DB — including any OPERATOR messages sent
     * during handoff, which never entered the agent's memory.
     */
    private async resumeBotIfResolved(conversation: any): Promise<void> {
        if (conversation.status !== ENUM_CONVERSATION_STATUS.RESOLVED) return;
        await this.conversationService.updateStatus(
            conversation.id,
            ENUM_CONVERSATION_STATUS.OPEN
        );
        conversation.status = ENUM_CONVERSATION_STATUS.OPEN;
        conversation.botEnabled = true;
        // Best-effort: updateStatus above already committed status=OPEN, so a
        // rejection here must not bubble into process() (no try/catch; the
        // BullMQ caller retries and the retry would short-circuit since the
        // conversation is no longer RESOLVED — leaving the reactivation
        // message unanswered). Fire-and-forget, matching the other sites.
        this.chatbotAIService
            .deleteSession(conversation.id)
            .catch(err =>
                this.logger.error(
                    `Failed to delete AI session for conversation ${conversation.id}: ${err.message}`
                )
            );
    }
}
