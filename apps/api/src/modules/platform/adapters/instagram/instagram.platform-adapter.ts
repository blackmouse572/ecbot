import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AdapterCapabilities,
    OutboundMessage,
    decodeActionPayload,
    encodeActionPayload,
} from '../../interfaces/message-model';
import {
    PlatformAttachment,
    PlatformOAuthCapability,
    PlatformOAuthTokens,
    PlatformOwnerProfile,
    PlatformUserProfile,
    PlatformWebhookEvent,
    PlatformWebhookEventKind,
} from '../../interfaces/platform-adapter.interface';
import {
    MessengerMessagingEvent,
    MessengerSendApiResponse,
    MessengerWebhookPayload,
} from '../messenger/messenger.types';
import {
    verifyMetaChallenge,
    verifyMetaSignature,
} from '../meta/meta-webhook.util';
import { PlatformAdapter } from '../platform-adapter.base';

const GRAPH_API_BASE = 'https://graph.instagram.com';
const API_VERSION = 'v23.0';
// Instagram caps a text message at 1000 bytes of UTF-8, not characters:
// Vietnamese diacritics take 2 or 3 bytes each.
const MESSAGE_BYTE_LIMIT = 1000;
const BUTTON_TITLE_LIMIT = 20;
const CARD_TEXT_LIMIT = 80;
const MEDIA_ATTACHMENTS = new Set(['image', 'video', 'audio', 'file']);
// Instagram accepts a single reaction type, "love".
const HEART_EMOJI = new Set(['❤️', '❤', '♥️', '♥']);

/**
 * Instagram DMs through the Instagram API with Instagram Login: the account
 * links with an Instagram professional login (no Facebook Page), and its
 * `externalId` is the professional account id that webhooks carry as
 * `entry.id`. Webhooks use the Messenger envelope under `object: "instagram"`,
 * signed with the Instagram app secret.
 */
@Injectable()
export class InstagramPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE;
    readonly capabilities: AdapterCapabilities = {
        cards: true,
        buttons: true,
        quickReplies: true,
        media: true,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: true, outbound: true },
        typing: true,
        markRead: true,
    };

    private readonly logger = new Logger(InstagramPlatformAdapter.name);
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly verifyToken: string;

    constructor(
        config: ConfigService,
        private readonly httpService: HttpService,
        private readonly accountService: AccountService
    ) {
        super();
        this.appId = config.get<string>('oauth.instagram.appId');
        this.appSecret = config.get<string>('oauth.instagram.appSecret');
        this.verifyToken = config.get<string>('facebook.webhookSecret');
    }

    private token(account: AccountEntity): string {
        return this.accountService.decryptToken(account.accessToken);
    }

    private graphUrl(endpoint: string): string {
        return `${GRAPH_API_BASE}/${API_VERSION}/${endpoint}`;
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
            expiresAt: account.tokenExpiresAt,
        }),
        getOwnerProfile: async (account): Promise<PlatformOwnerProfile> => {
            const data = await this.httpGet<{
                user_id: string;
                username: string;
                name?: string;
                profile_picture_url?: string;
            }>(this.graphUrl('me'), {
                access_token: this.token(account),
                fields: 'user_id,username,name,profile_picture_url',
            });
            return {
                id: data.user_id,
                name: data.name || data.username,
                avatar: data.profile_picture_url,
                link: `https://www.instagram.com/${data.username}`,
            };
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
        let payload: MessengerWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return [];
        }
        if (payload?.object !== 'instagram' || !Array.isArray(payload.entry)) {
            return [];
        }
        return payload.entry.flatMap(entry =>
            (entry.messaging ?? [])
                .filter(event => event.sender?.id && event.recipient?.id)
                .map(event => this.normalizeEvent(entry.id, event))
        );
    }

    private normalizeEvent(
        accountId: string,
        event: MessengerMessagingEvent
    ): PlatformWebhookEvent {
        let kind: PlatformWebhookEventKind = 'unknown';
        let externalMessageId: string | undefined;
        let text: string | undefined;
        let action: PlatformWebhookEvent['action'];
        let attachments: PlatformAttachment[] | undefined;
        let reaction: PlatformWebhookEvent['reaction'];

        if (event.message) {
            kind = event.message.is_echo ? 'echo' : 'message';
            externalMessageId = event.message.mid;
            text = event.message.text;
            if (event.message.quick_reply) {
                action = decodeActionPayload(event.message.quick_reply.payload);
            }
            // Shares, reels and story mentions carry no media we can store.
            const media = (event.message.attachments ?? []).filter(a =>
                MEDIA_ATTACHMENTS.has(a.type)
            );
            if (media.length) {
                attachments = media.map(a => ({
                    type: a.type as PlatformAttachment['type'],
                    url: a.payload?.url,
                    raw: a,
                }));
            }
        } else if (event.postback) {
            kind = 'postback';
            externalMessageId = event.postback.mid;
            text = event.postback.title;
            action = decodeActionPayload(event.postback.payload);
        } else if (event.reaction) {
            kind = 'reaction';
            // The mid is the reacted message's id: reusing it as the dedupe
            // key would drop the reaction as a repeat of that message, and an
            // unreact as a repeat of the react.
            externalMessageId = `reaction:${event.reaction.mid}:${event.reaction.action}:${event.timestamp}`;
            reaction = {
                emoji: event.reaction.emoji,
                messageId: event.reaction.mid,
                action: event.reaction.action,
            };
        } else if (event.read) {
            kind = 'read';
        }

        // On an echo the account is the sender; keep the customer as senderId
        // like every other event (see PlatformWebhookEvent.senderId). Our own
        // sends are told apart by app id, as in MessengerPlatformAdapter.
        const isEcho = kind === 'echo';
        const appId = event.message?.app_id;
        return {
            kind,
            accountKey: accountId,
            senderId: isEcho ? event.recipient.id : event.sender.id,
            recipientId: isEcho ? event.sender.id : event.recipient.id,
            sentByUs:
                isEcho && appId !== undefined
                    ? String(appId) === this.appId
                    : undefined,
            externalMessageId,
            text,
            timestamp: new Date(event.timestamp ?? Date.now()),
            raw: event,
            action,
            attachments,
            reaction,
        };
    }

    // ----- fetch -----

    async fetchSenderProfile(
        account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        try {
            const data = await this.httpGet<{
                id?: string;
                name?: string;
                username?: string;
                profile_pic?: string;
            }>(this.graphUrl(senderId), {
                access_token: this.token(account),
                fields: 'name,username,profile_pic',
            });
            return {
                id: data.id ?? senderId,
                name: data.name || data.username,
                avatar: data.profile_pic,
                raw: data,
            };
        } catch {
            return { id: senderId };
        }
    }

    // ----- outbound hooks -----

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        const result = await this.httpPost<MessengerSendApiResponse>(account, {
            recipient: { id: senderId },
            message: this.renderMessage(msg),
        });
        return { externalId: result.message_id };
    }

    protected async doReact(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact'
    ): Promise<void> {
        if (action === 'react' && !HEART_EMOJI.has(emoji)) {
            throw new UnprocessableEntityException({
                message: 'instagram.error.heartReactionOnly',
                statusCode: 422,
            });
        }
        await this.httpPost(account, {
            recipient: { id: senderId },
            sender_action: action,
            payload:
                action === 'react'
                    ? { message_id: externalId, reaction: 'love' }
                    : { message_id: externalId },
        });
    }

    protected async doTyping(
        account: AccountEntity,
        senderId: string,
        on: boolean
    ): Promise<void> {
        await this.sendAction(
            account,
            senderId,
            on ? 'typing_on' : 'typing_off'
        );
    }

    protected async doMarkRead(
        account: AccountEntity,
        senderId: string
    ): Promise<void> {
        await this.sendAction(account, senderId, 'mark_seen');
    }

    private renderMessage(msg: OutboundMessage): Record<string, unknown> {
        const c = msg.content;
        let message: Record<string, unknown>;

        if (c.kind === 'text') {
            message = { text: this.truncate(c.text) };
        } else if (c.kind === 'media' && c.mediaType === 'file') {
            // Instagram has no file attachment; send the link instead.
            message = {
                text: this.truncate(
                    [c.caption, c.url].filter(Boolean).join('\n')
                ),
            };
        } else if (c.kind === 'media') {
            message = {
                attachment: { type: c.mediaType, payload: { url: c.url } },
            };
        } else {
            const card = c.card;
            const element: Record<string, unknown> = {
                title: this.truncateGraphemes(
                    card.title ?? card.body ?? ' ',
                    CARD_TEXT_LIMIT
                ),
                subtitle: this.cardText(card.subtitle ?? card.body),
                image_url: card.imageUrl,
            };
            if (card.buttons?.length) {
                element.buttons = card.buttons.map(b =>
                    b.kind === 'link'
                        ? {
                              type: 'web_url',
                              title: this.buttonTitle(b.label),
                              url: b.url,
                          }
                        : {
                              type: 'postback',
                              title: this.buttonTitle(b.label),
                              payload: encodeActionPayload(b.id, b.value),
                          }
                );
            }
            message = {
                attachment: {
                    type: 'template',
                    payload: { template_type: 'generic', elements: [element] },
                },
            };
        }

        if (msg.quickReplies?.length) {
            message.quick_replies = msg.quickReplies.slice(0, 13).map(q => ({
                content_type: 'text',
                title: this.buttonTitle(q.label),
                payload: encodeActionPayload(q.id, q.value),
            }));
        }
        return message;
    }

    private buttonTitle(label: string): string {
        return this.truncateGraphemes(label, BUTTON_TITLE_LIMIT);
    }

    private cardText(text: string | undefined): string | undefined {
        return text === undefined
            ? undefined
            : this.truncateGraphemes(text, CARD_TEXT_LIMIT);
    }

    private truncate(text: string): string {
        const s = this.truncateBytes(text, MESSAGE_BYTE_LIMIT);
        if (!s.trim()) {
            throw new UnprocessableEntityException({
                message: 'platform.error.emptyMessage',
                statusCode: 422,
            });
        }
        return s;
    }

    /** Cuts on grapheme boundaries so the UTF-8 result fits `maxBytes`. */
    private truncateBytes(text: string, maxBytes: number): string {
        if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
        const suffix = '...';
        let budget = maxBytes - Buffer.byteLength(suffix, 'utf8');
        let out = '';
        const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
        for (const { segment } of seg.segment(text)) {
            budget -= Buffer.byteLength(segment, 'utf8');
            if (budget < 0) break;
            out += segment;
        }
        return out + suffix;
    }

    // ----- private helpers -----

    private async sendAction(
        account: AccountEntity,
        recipientId: string,
        action: 'typing_on' | 'typing_off' | 'mark_seen'
    ): Promise<void> {
        try {
            await this.httpPost(account, {
                recipient: { id: recipientId },
                sender_action: action,
            });
        } catch (error) {
            this.logger.warn(
                `Instagram action ${action} failed for ${recipientId}: ${error?.message ?? error}`
            );
        }
    }

    private async httpGet<T>(
        url: string,
        params: Record<string, string>
    ): Promise<T> {
        try {
            const response = await this.httpService.axiosRef.get<T>(url, {
                params,
            });
            return response.data;
        } catch (error) {
            this.rethrowPlatformError(error, `Instagram GET ${url}`);
        }
    }

    private async httpPost<T>(
        account: AccountEntity,
        body: Record<string, unknown>
    ): Promise<T> {
        try {
            const response = await this.httpService.axiosRef.post<T>(
                this.graphUrl('me/messages'),
                body,
                { params: { access_token: this.token(account) } }
            );
            return response.data;
        } catch (error) {
            this.rethrowPlatformError(error, 'Instagram sendMessage');
        }
    }
}
