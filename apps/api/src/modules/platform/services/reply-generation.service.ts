import { AccountService } from '@app/modules/account/services/account.service';
import {
    AIChatHistoryMessage,
    ChatbotAIService,
} from '@app/modules/chatbot/services/chatbot-ai.service';
import { ENUM_CONVERSATION_STATUS } from '@app/modules/conversation/enums/conversation.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ConversationService } from '@app/modules/conversation/services/conversation.service';
import { ManifestBuilderService } from '@app/modules/tool/services/manifest-builder.service';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { UNVIEWABLE_IMAGE_NOTE } from '../constants/media.constant';
import {
    MESSAGE_HISTORY_WINDOW,
    MESSAGE_TYPING_REFRESH_MS,
} from '../constants/message-debounce.constant';
import {
    imageHistoryNote,
    imageUrls,
    text as toText,
} from '../interfaces/message-model';
import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';
import { GenerationLeaseService } from './generation-lease.service';
import { PlatformAdapterRegistry } from './platform-adapter.registry';
import {
    DeliveryResult,
    StreamingDelivery,
} from './streaming-delivery.service';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from '@app/app/ai-usage-meter.interface';

export interface ReplyInput {
    conversationId: string;
    senderId: string;
    customerId: string;
    contactPointId: string;
    texts: string[];
}

@Injectable()
export class ReplyGenerationService {
    private readonly logger = new Logger(ReplyGenerationService.name);

    constructor(
        private readonly accountService: AccountService,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly messageRepository: MessageRepository,
        private readonly registry: PlatformAdapterRegistry,
        private readonly lease: GenerationLeaseService,
        private readonly streaming: StreamingDelivery,
        private readonly moduleRef: ModuleRef,
        private readonly orm: MikroORM,
        private readonly manifestBuilder: ManifestBuilderService,
        private readonly messageMedia: MessageMediaService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    private get conversationService(): ConversationService {
        return this.moduleRef.get(ConversationService, { strict: false });
    }

    /**
     * A BullMQ job runs outside the HTTP request context, and so does an HTTP
     * caller that fans this work out. Fork a fresh EntityManager and run the
     * generation inside its RequestContext so every ORM read/write in `execute`
     * uses a disposable identity map, discarded when the turn settles — the same
     * seam `ContextualWorkerHost` provided around the processor's `handle`.
     */
    async run(input: ReplyInput): Promise<void> {
        if (input.texts.length === 0) return;
        await RequestContext.create(this.orm.em, () => this.execute(input));
    }

    private async execute(input: ReplyInput): Promise<void> {
        const { conversationId, senderId, customerId, contactPointId, texts } =
            input;

        // Capture the generation lease. A newer inbound message bumps the epoch
        // (in debounce.schedule), so if it moves while we generate, this turn is
        // superseded and must discard rather than send stale context.
        const myEpoch = await this.lease.current(conversationId);

        const conversation =
            await this.conversationService.findOneById(conversationId);
        if (!conversation) return;
        if (!conversation.botEnabled) return;
        if (conversation.status === ENUM_CONVERSATION_STATUS.RESOLVED) return;

        const account = await this.accountService.findOne(
            { id: (conversation.account as any).id ?? conversation.account },
            { populate: ['chatbot', 'chatbot.workspace'] } as any
        );
        if (!account?.chatbot) return;

        const chatbot = account.chatbot;
        const adapter = this.registry.get(account.type);

        // Keep the typing indicator alive: platforms expire `typing_on` after
        // ~20s, but a reply with tool roundtrips can run longer, so re-send it
        // on an interval until stopTyping() fires (final message sent, discard,
        // or no reply).
        let typingTimer: ReturnType<typeof setInterval> | undefined;
        const sendTyping = (on: boolean) => {
            if (chatbot.typingIndicator) {
                adapter.startTyping(account, senderId, on).catch(() => {});
            }
        };
        const startTyping = () => {
            if (!chatbot.typingIndicator || typingTimer) return;
            sendTyping(true);
            typingTimer = setInterval(
                () => sendTyping(true),
                MESSAGE_TYPING_REFRESH_MS
            );
            typingTimer.unref?.();
        };
        const stopTyping = () => {
            if (typingTimer) {
                clearInterval(typingTimer);
                typingTimer = undefined;
            }
            sendTyping(false);
        };

        startTyping();
        try {
            const combinedText = texts.join('\n');
            const tools = await this.manifestBuilder.build(
                chatbot.id,
                chatbot.workspace.id
            );

            // The AI agent is stateless (no LangGraph checkpointer), so we supply
            // conversation context each turn from the DB (the message source of
            // truth). The current burst is already persisted as the last
            // `texts.length` inbound rows (a reply to an earlier burst can sit
            // between them), so leave those out to avoid duplicating the turn
            // we're about to send as `message`.
            const recent =
                await this.messageRepository.findRecentByConversation(
                    conversationId,
                    MESSAGE_HISTORY_WINDOW + texts.length
                );
            const burstRows = new Set(
                recent
                    .filter(m => m.direction === ENUM_MESSAGE_DIRECTION.INBOUND)
                    .slice(-texts.length)
            );
            const prior = recent.filter(m => !burstRows.has(m));
            // The bot's own images stay out: the model copied an assistant
            // "[image]" into its replies, and its text says what it showed.
            const history: AIChatHistoryMessage[] = prior
                .map(m => ({
                    role: this.roleFor(m.authorType, m.direction),
                    content: [
                        m.text,
                        m.direction === ENUM_MESSAGE_DIRECTION.INBOUND
                            ? imageHistoryNote(m.attachments)
                            : '',
                    ]
                        .filter(Boolean)
                        .join(' '),
                }))
                .filter(m => m.content);
            // Images in this burst go to apps/ai (which describes them), as
            // short-lived urls for the ones stored privately. One with no url
            // (a Telegram photo whose download failed) becomes a note instead.
            const burst = await Promise.all(
                [...burstRows].map(async m => ({
                    id: m.id,
                    attachments: await this.messageMedia.resolve(
                        m.attachments,
                        conversationId
                    ),
                }))
            );
            const attachments = burst.flatMap(m =>
                imageUrls(m.attachments).map(url => ({
                    attachment_id: m.id,
                    preview_url: url,
                }))
            );
            const unviewable = burst
                .flatMap(m => m.attachments)
                .filter(a => a.type === 'image' && !a.url)
                .map(() => UNVIEWABLE_IMAGE_NOTE);
            const message = [combinedText, ...unviewable]
                .filter(Boolean)
                .join('\n');

            const triggerMessage =
                await this.messageRepository.findLatestInbound(conversationId);

            // Out of tokens: say the fallback line rather than burning an LLM
            // call we cannot bill.
            // No meter is the public build: allowed, and nothing recorded below.
            const budget = (await this.meter?.check(
                chatbot.workspace.id,
                chatbot
            )) ?? { allowed: true };
            if (!budget.allowed) {
                this.logger.log(
                    `Token budget blocked conversation ${conversationId}: ${budget.reason}`
                );
                await this.sendFallback(
                    chatbot,
                    account,
                    senderId,
                    conversationId
                );
                return;
            }

            const ac = new AbortController();
            let deliveryResult: DeliveryResult | null = null;
            try {
                const stream = await this.chatbotAIService.streamChat(
                    {
                        chatbot_id: chatbot.id,
                        user_id: senderId,
                        provider_id: account.id,
                        message,
                        chat_session_id: conversationId,
                        tools,
                        max_tool_iterations: 5,
                        conversation_id: conversationId,
                        customer_id: customerId,
                        contact_point_id: contactPointId,
                        history,
                        attachments,
                        trigger_message_id: triggerMessage?.id,
                    },
                    ac.signal
                );
                this.logger.debug(
                    `AI stream started for conversation ${conversationId}`
                );
                deliveryResult = await this.streaming.deliver({
                    adapter,
                    account,
                    senderId,
                    conversationId,
                    chatbot, // selects incremental vs buffered by guardrail config
                    stream,
                    abort: ac,
                    isCurrent: () =>
                        this.lease.isCurrent(conversationId, myEpoch),
                    onSegmentPersist: async (
                        segmentText: string,
                        attachments?: unknown[]
                    ) => {
                        const clientNonce = randomUUID();
                        await this.messageRepository.insertPendingOutbound(
                            conversationId,
                            clientNonce,
                            {
                                authorType: ENUM_MESSAGE_AUTHOR.BOT,
                                authorId: chatbot.id,
                                text: segmentText,
                                attachments,
                                dateSent: new Date(),
                            }
                        );
                        return clientNonce;
                    },
                    onSent: async (nonce: string, externalId: string) => {
                        await this.messageRepository.markOutboundSent(
                            nonce,
                            externalId
                        );
                        this.logger.debug(
                            `Outbound sent: conversation=${conversationId} externalId=${externalId}`
                        );
                    },
                    onImageDescription: (messageId, description) =>
                        this.messageRepository.describeImages(
                            messageId,
                            description
                        ),
                    onFailed: async (nonce: string) => {
                        this.logger.error(
                            `Send failed for conversation ${conversationId}`
                        );
                        await this.messageRepository.markOutboundFailed(nonce);
                    },
                });
                this.logger.debug(
                    `AI stream completed for conversation ${conversationId}`
                );
            } catch (err) {
                this.logger.error(
                    `AI stream failed for conversation ${conversationId}: ${(err as Error).message}`
                );
            }

            // Booked before any early return below: the tokens were spent the
            // moment apps/ai generated, whatever we decide to do with the text.
            if (deliveryResult?.usage) {
                await this.meter?.record({
                    workspaceId: chatbot.workspace.id,
                    usage: deliveryResult.usage,
                    source: ENUM_AI_USAGE_SOURCE.PLATFORM_REPLY,
                    chatbotId: chatbot.id,
                    accountId: account.id,
                    platform: account.type,
                    model: chatbot.modelTextName,
                    conversationId,
                });
            }

            if (!deliveryResult) return;

            if (deliveryResult.superseded && !deliveryResult.anySent) {
                this.logger.debug(
                    `Generation superseded for conversation ${conversationId} — discarding`
                );
                return;
            }

            if (deliveryResult.guardrailBlocked) {
                this.logger.log(
                    `Guardrail block in conversation ${conversationId}: ${deliveryResult.guardrailReason}`
                );
                await this.handleGuardrailBlock(
                    deliveryResult.guardrailReason,
                    chatbot,
                    account,
                    senderId,
                    conversation
                );
                return;
            }

            let anySent = deliveryResult.anySent;

            if (!anySent) {
                const { triggered, conversation: updated } =
                    await this.conversationService.recordFallback(
                        chatbot.id,
                        account.id,
                        senderId,
                        chatbot.handoffFallbackThreshold
                    );
                if (triggered) {
                    await this.conversationService.triggerHandoff(
                        updated,
                        chatbot.workspace.id,
                        'fallback_threshold',
                        chatbot.handoffMessage
                    );
                    return;
                }
                if (!chatbot.fallbackMessage) return;
                anySent = await this.sendFallback(
                    chatbot,
                    account,
                    senderId,
                    conversationId
                );
            }

            if (anySent)
                await this.conversationService.resetFallbackCount(
                    conversationId
                );
        } finally {
            stopTyping();
        }
    }

    private roleFor(
        _authorType: ENUM_MESSAGE_AUTHOR,
        direction: ENUM_MESSAGE_DIRECTION
    ): AIChatHistoryMessage['role'] {
        return direction === ENUM_MESSAGE_DIRECTION.INBOUND
            ? 'user'
            : 'assistant';
    }

    /**
     * Persist and send the chatbot's fallback line. Used wherever we decide not
     * to (or cannot) produce a real reply — guardrail block, no reply at all,
     * exhausted token budget. Returns whether it reached the customer.
     */
    private async sendFallback(
        chatbot: any,
        account: any,
        senderId: string,
        conversationId: string
    ): Promise<boolean> {
        if (!chatbot.fallbackMessage) return false;

        const clientNonce = randomUUID();
        await this.messageRepository.insertPendingOutbound(
            conversationId,
            clientNonce,
            {
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
                authorId: chatbot.id,
                text: chatbot.fallbackMessage,
                dateSent: new Date(),
            }
        );
        try {
            const adapter = this.registry.get(account.type);
            const { externalId } = await adapter.sendMessage(
                account,
                senderId,
                toText(chatbot.fallbackMessage)
            );
            await this.messageRepository.markOutboundSent(
                clientNonce,
                externalId
            );
            return true;
        } catch (err) {
            this.logger.error(
                `Fallback send failed for conversation ${conversationId}: ${(err as Error).message}`
            );
            await this.messageRepository.markOutboundFailed(clientNonce);
            return false;
        }
    }

    private async handleGuardrailBlock(
        reason: string,
        chatbot: any,
        account: any,
        senderId: string,
        conversation: any
    ): Promise<void> {
        await this.sendFallback(chatbot, account, senderId, conversation.id);

        if (chatbot.guardrailEscalateOnBlock) {
            await this.conversationService.triggerHandoff(
                conversation,
                chatbot.workspace.id,
                reason,
                chatbot.handoffMessage
            );
        }
    }
}
