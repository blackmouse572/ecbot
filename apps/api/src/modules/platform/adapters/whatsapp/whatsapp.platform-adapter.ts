import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AdapterCapabilities,
    OutboundMessage,
    decodeActionPayload,
    encodeActionPayload,
} from '../../interfaces/message-model';
import {
    PlatformOAuthCapability,
    PlatformOAuthTokens,
    PlatformOwnerProfile,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../../interfaces/platform-adapter.interface';
import {
    verifyMetaChallenge,
    verifyMetaSignature,
} from '../meta/meta-webhook.util';
import { PlatformAdapter } from '../platform-adapter.base';
import {
    WhatsAppChangeValue,
    WhatsAppInboundMessage,
    WhatsAppPhoneNumber,
    WhatsAppSendResponse,
    WhatsAppWebhookPayload,
} from './whatsapp.types';

const GRAPH_API_BASE = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v21.0';
const MESSAGE_LIMIT = 4096;
// Interactive messages cap `body.text` far below plain text messages.
const INTERACTIVE_BODY_LIMIT = 1024;
const MAX_REPLY_BUTTONS = 3;
const BUTTON_TITLE_LIMIT = 20;
const ATTACHMENT_TYPES = [
    'image',
    'video',
    'audio',
    'sticker',
    'location',
] as const;

/**
 * WhatsApp Cloud API. The account is one business phone number:
 * `account.externalId` is its `phone_number_id`, which every webhook carries in
 * `metadata`, so the shared `/webhooks/whatsapp` route resolves the account.
 */
@Injectable()
export class WhatsAppPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS;
    // Read receipts and the typing indicator are keyed on the inbound message
    // id, which the doMarkRead / doTyping hooks don't receive — so both stay off.
    readonly capabilities: AdapterCapabilities = {
        cards: false,
        buttons: false,
        quickReplies: true,
        media: true,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: true, outbound: true },
        typing: false,
        markRead: false,
    };

    private readonly apiVersion: string;
    private readonly appSecret: string;
    private readonly verifyToken: string;

    constructor(
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
        private readonly accountService: AccountService
    ) {
        super();
        this.apiVersion =
            this.config.get<string>('facebook.graphApiVersion') ??
            DEFAULT_API_VERSION;
        this.appSecret = this.config.get<string>('facebook.appSecret');
        this.verifyToken = this.config.get<string>('facebook.webhookSecret');
    }

    private token(account: AccountEntity): string {
        return this.accountService.decryptToken(account.accessToken);
    }

    private graphUrl(endpoint: string): string {
        return `${GRAPH_API_BASE}/${this.apiVersion}/${endpoint}`;
    }

    // ----- oauth -----

    readonly oauth: PlatformOAuthCapability = {
        exchangeCode: async (): Promise<PlatformOAuthTokens> => {
            throw new UnprocessableEntityException({
                message: 'platform.error.useOAuthService',
                statusCode: 422,
            });
        },
        refresh: async (account): Promise<PlatformOAuthTokens> => ({
            accessToken: this.token(account),
        }),
        getOwnerProfile: async (account): Promise<PlatformOwnerProfile> => {
            try {
                const { data } =
                    await this.httpService.axiosRef.get<WhatsAppPhoneNumber>(
                        this.graphUrl(account.externalId),
                        {
                            params: {
                                fields: 'id,display_phone_number,verified_name',
                            },
                            headers: this.authHeaders(account),
                        }
                    );
                return {
                    id: data.id,
                    name: data.verified_name,
                    link: `https://wa.me/${data.display_phone_number.replace(/\D/g, '')}`,
                };
            } catch (error) {
                this.rethrowPlatformError(error, 'WhatsApp getOwnerProfile');
            }
        },
    };

    // ----- webhook -----

    verifyChallenge(req: Request): Response | null {
        return verifyMetaChallenge(req, this.verifyToken);
    }

    verifySignature(
        rawBody: string,
        headers: Headers | Record<string, string>
    ): boolean {
        return verifyMetaSignature(rawBody, headers, this.appSecret);
    }

    parse(rawBody: string): PlatformWebhookEvent[] {
        let payload: WhatsAppWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return [];
        }
        if (
            payload?.object !== 'whatsapp_business_account' ||
            !Array.isArray(payload.entry)
        ) {
            return [];
        }
        const events: PlatformWebhookEvent[] = [];
        for (const entry of payload.entry) {
            for (const change of entry.changes ?? []) {
                if (change.value?.metadata) {
                    events.push(...this.normalizeValue(change.value));
                }
            }
        }
        return events;
    }

    private normalizeValue(value: WhatsAppChangeValue): PlatformWebhookEvent[] {
        const phoneNumberId = value.metadata.phone_number_id;
        const names = new Map(
            (value.contacts ?? []).map(c => [c.wa_id, c.profile?.name])
        );

        const messages = (value.messages ?? []).map(msg => ({
            ...this.normalizeMessage(msg),
            accountKey: phoneNumberId,
            senderId: msg.from,
            recipientId: phoneNumberId,
            senderName: names.get(msg.from),
            timestamp: new Date(Number(msg.timestamp) * 1000),
            raw: msg,
        }));

        const statuses = (value.statuses ?? [])
            .filter(s => s.status === 'delivered' || s.status === 'read')
            .map((s): PlatformWebhookEvent => ({
                kind: s.status === 'read' ? 'read' : 'delivery',
                accountKey: phoneNumberId,
                senderId: s.recipient_id,
                recipientId: phoneNumberId,
                timestamp: new Date(Number(s.timestamp) * 1000),
                raw: s,
            }));

        return [...messages, ...statuses];
    }

    private normalizeMessage(
        msg: WhatsAppInboundMessage
    ): Pick<
        PlatformWebhookEvent,
        | 'kind'
        | 'externalMessageId'
        | 'text'
        | 'action'
        | 'attachments'
        | 'reaction'
    > {
        const externalMessageId = msg.id;

        if (msg.type === 'text') {
            return { kind: 'message', externalMessageId, text: msg.text?.body };
        }

        if (msg.type === 'interactive' || msg.type === 'button') {
            const reply =
                msg.interactive?.button_reply ?? msg.interactive?.list_reply;
            const id = reply?.id ?? msg.button?.payload;
            return {
                kind: 'postback',
                externalMessageId,
                text: reply?.title ?? msg.button?.text,
                action: id ? decodeActionPayload(id) : undefined,
            };
        }

        if (msg.type === 'reaction' && msg.reaction) {
            return {
                kind: 'reaction',
                externalMessageId,
                reaction: {
                    emoji: msg.reaction.emoji ?? '',
                    messageId: msg.reaction.message_id,
                    action: msg.reaction.emoji ? 'react' : 'unreact',
                },
            };
        }

        if (msg.type === 'document' && msg.document) {
            return {
                kind: 'message',
                externalMessageId,
                text: msg.document.caption,
                attachments: [{ type: 'file', raw: msg.document }],
            };
        }

        const type = ATTACHMENT_TYPES.find(t => t === msg.type);
        if (type && msg[type]) {
            const media = msg[type];
            return {
                kind: 'message',
                externalMessageId,
                text: 'caption' in media ? media.caption : undefined,
                attachments: [{ type, raw: media }],
            };
        }

        return { kind: 'unknown', externalMessageId };
    }

    // ----- fetch -----

    // Cloud API has no profile lookup; the name arrives on the webhook as
    // `senderName` instead.
    async fetchSenderProfile(
        _account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        return { id: senderId };
    }

    // ----- outbound hooks -----

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        const res = await this.post<WhatsAppSendResponse>(
            account,
            senderId,
            this.renderMessage(msg),
            'WhatsApp sendMessage'
        );
        return { externalId: res.messages[0].id };
    }

    protected async doReact(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact'
    ): Promise<void> {
        await this.post(
            account,
            senderId,
            {
                type: 'reaction',
                reaction: {
                    message_id: externalId,
                    emoji: action === 'unreact' ? '' : emoji,
                },
            },
            'WhatsApp reaction'
        );
    }

    private renderMessage(msg: OutboundMessage): Record<string, unknown> {
        const c = msg.content;

        if (c.kind === 'media') {
            const type = c.mediaType === 'file' ? 'document' : c.mediaType;
            return { type, [type]: { link: c.url, caption: c.caption } };
        }

        // Cards never reach here — `cards: false` makes degrade() turn them
        // into text.
        const text = c.kind === 'text' ? c.text : msg.fallbackText;
        const replies = msg.quickReplies ?? [];

        if (replies.length && replies.length <= MAX_REPLY_BUTTONS) {
            return {
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: this.truncate(text, INTERACTIVE_BODY_LIMIT) },
                    action: {
                        buttons: replies.map(q => ({
                            type: 'reply',
                            reply: {
                                id: encodeActionPayload(q.id, q.value),
                                title: this.truncateGraphemes(
                                    q.label,
                                    BUTTON_TITLE_LIMIT
                                ),
                            },
                        })),
                    },
                },
            };
        }

        // More replies than WhatsApp's button limit: fold them into the text,
        // exactly as degrade() does for platforms without quick replies.
        const body = replies.length
            ? `${text}\n${replies.map(q => `- ${q.label}`).join('\n')}`
            : text;
        return { type: 'text', text: { body: this.truncate(body) } };
    }

    private truncate(t: string, limit = MESSAGE_LIMIT): string {
        const s = this.truncateGraphemes(t, limit);
        if (!s.trim()) {
            throw new UnprocessableEntityException({
                message: 'platform.error.emptyMessage',
                statusCode: 422,
            });
        }
        return s;
    }

    // ----- private helpers -----

    private authHeaders(account: AccountEntity): Record<string, string> {
        return { Authorization: `Bearer ${this.token(account)}` };
    }

    private async post<T>(
        account: AccountEntity,
        to: string,
        message: Record<string, unknown>,
        context: string
    ): Promise<T> {
        try {
            const response = await this.httpService.axiosRef.post<T>(
                this.graphUrl(`${account.externalId}/messages`),
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    ...message,
                },
                { headers: this.authHeaders(account) }
            );
            return response.data;
        } catch (error) {
            this.rethrowPlatformError(error, context);
        }
    }
}
