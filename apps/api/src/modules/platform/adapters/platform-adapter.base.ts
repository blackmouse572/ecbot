import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { IMessageMedia } from '@app/modules/conversation/interfaces/message-media.interface';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MEDIA_FETCH_TIMEOUT_MS } from '../constants/media.constant';
import { isAxiosError } from 'axios';
import {
    AdapterCapabilities,
    Card,
    OutboundMessage,
    QuickReply,
} from '../interfaces/message-model';
import {
    PlatformAttachment,
    PlatformConversation,
    PlatformMessage,
    PlatformOAuthCapability,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../interfaces/platform-adapter.interface';

export abstract class PlatformAdapter {
    abstract readonly type: ENUM_ACCOUNT_TYPE;
    abstract readonly capabilities: AdapterCapabilities;
    abstract readonly oauth: PlatformOAuthCapability;

    // ---- inbound (platform implements) ----
    abstract verifyChallenge(req: Request): Response | null;
    abstract verifySignature(
        rawBody: string,
        headers: Headers | Record<string, string>
    ): boolean;
    abstract parse(rawBody: string): PlatformWebhookEvent[];

    // ---- fetch ----
    abstract fetchSenderProfile(
        account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile>;
    fetchConversations?(
        account: AccountEntity,
        senderId: string
    ): Promise<PlatformConversation[]>;
    fetchMessages?(
        account: AccountEntity,
        conversationId: string
    ): Promise<PlatformMessage[]>;
    /**
     * Reconciliation backstop (ADR-0002 / ADR-0007). Return all inbound
     * PlatformWebhookEvents received since `lookback`. Called by
     * InboundReconciliationScheduler to backfill messages missed during outages
     * longer than the platform retry window. Optional — skip if not implemented.
     */
    reconcile?(
        account: AccountEntity,
        lookback: Date
    ): Promise<PlatformWebhookEvent[]>;

    /**
     * Download an inbound attachment's bytes. Default: GET its public URL
     * (Messenger, Zalo CDNs). Platforms that hand out ids or need
     * credentials override this. Null when there is nothing to download.
     */
    async fetchMedia(
        _account: AccountEntity,
        attachment: PlatformAttachment
    ): Promise<IMessageMedia | null> {
        if (!attachment.url) return null;
        const res = await fetch(attachment.url, {
            signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return null;
        return {
            data: Buffer.from(await res.arrayBuffer()),
            mime: res.headers.get('content-type')?.split(';')[0] ?? '',
        };
    }

    // ---- outbound (concrete: degrade + guard → protected hook) ----
    async sendMessage(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        return this.doSend(account, senderId, this.degrade(msg));
    }

    async editMessage(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        msg: OutboundMessage
    ): Promise<void> {
        if (!this.capabilities.editMessage || !this.doEdit) return;
        await this.doEdit(account, senderId, externalId, this.degrade(msg));
    }

    async deleteMessage(
        account: AccountEntity,
        senderId: string,
        externalId: string
    ): Promise<void> {
        if (!this.capabilities.deleteMessage || !this.doDelete) return;
        await this.doDelete(account, senderId, externalId);
    }

    async addReaction(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact' = 'react'
    ): Promise<void> {
        if (!this.capabilities.reactions.outbound || !this.doReact) return;
        await this.doReact(account, senderId, externalId, emoji, action);
    }

    async startTyping(
        account: AccountEntity,
        senderId: string,
        on: boolean
    ): Promise<void> {
        if (!this.capabilities.typing || !this.doTyping) return;
        await this.doTyping(account, senderId, on);
    }

    async markRead(account: AccountEntity, senderId: string): Promise<void> {
        if (!this.capabilities.markRead || !this.doMarkRead) return;
        await this.doMarkRead(account, senderId);
    }

    // ---- protected hooks (platform implements) ----
    protected abstract doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }>;
    protected doEdit?(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        msg: OutboundMessage
    ): Promise<void>;
    protected doDelete?(
        account: AccountEntity,
        senderId: string,
        externalId: string
    ): Promise<void>;
    protected doReact?(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact'
    ): Promise<void>;
    protected doTyping?(
        account: AccountEntity,
        senderId: string,
        on: boolean
    ): Promise<void>;
    protected doMarkRead?(
        account: AccountEntity,
        senderId: string
    ): Promise<void>;

    // ---- shared degrade ----
    protected degrade(msg: OutboundMessage): OutboundMessage {
        let content = msg.content;
        let quickReplies = msg.quickReplies;

        // card → text when cards unsupported (also discard quick replies — fallback is self-contained)
        if (content.kind === 'card' && !this.capabilities.cards) {
            content = { kind: 'text', text: msg.fallbackText };
            quickReplies = undefined;
        } else if (content.kind === 'card' && !this.capabilities.buttons) {
            // keep card, drop unsupported buttons
            const { buttons: _drop, ...rest } = content.card;
            content = { kind: 'card', card: rest as Card };
        }

        // media → text when media unsupported
        if (content.kind === 'media' && !this.capabilities.media) {
            content = {
                kind: 'text',
                text: content.caption ?? msg.fallbackText,
            };
        }

        // quickReplies → appended to text when unsupported
        if (quickReplies?.length && !this.capabilities.quickReplies) {
            if (content.kind === 'text') {
                const opts = quickReplies
                    .map((q: QuickReply) => `- ${q.label}`)
                    .join('\n');
                content = { kind: 'text', text: `${content.text}\n${opts}` };
            }
            quickReplies = undefined;
        }

        return { ...msg, content, quickReplies };
    }

    // ---- shared truncate (grapheme-aware — won't split surrogate pairs / ZWJ emoji) ----
    protected truncateGraphemes(
        text: string,
        limit: number,
        suffix = '...'
    ): string {
        const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
        const graphemes = [...seg.segment(text)];
        if (graphemes.length <= limit) return text;
        const keep = graphemes
            .slice(0, Math.max(0, limit - [...seg.segment(suffix)].length))
            .map(g => g.segment)
            .join('');
        return keep + suffix;
    }

    // ---- shared HTTP error surfacing ----
    // Axios only reports "Request failed with status code 4xx"; the platform's
    // real reason lives in the response body (Meta `error.message`, Telegram
    // `description`, Zalo `message`). Rethrow so it's visible in logs + the API
    // response instead of an opaque AxiosError.
    protected rethrowPlatformError(error: unknown, context: string): never {
        if (isAxiosError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as
                | {
                      error?: { message?: string };
                      description?: string;
                      message?: string;
                  }
                | string
                | undefined;
            const detail =
                (typeof data === 'object' && data
                    ? (data.error?.message ?? data.description ?? data.message)
                    : undefined) ??
                (typeof data === 'string' ? data : JSON.stringify(data));
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_GATEWAY,
                    message: `${context} failed (HTTP ${status}): ${detail}`,
                    platformError: data,
                },
                HttpStatus.BAD_GATEWAY
            );
        }
        throw error instanceof Error ? error : new Error(String(error));
    }
}
