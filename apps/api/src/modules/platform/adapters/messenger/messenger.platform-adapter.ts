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
    PlatformConversation,
    PlatformMessage,
    PlatformOAuthCapability,
    PlatformOAuthTokens,
    PlatformOwnerProfile,
    PlatformUserProfile,
    PlatformWebhookEvent,
    PlatformWebhookEventKind,
} from '../../interfaces/platform-adapter.interface';
import {
    verifyMetaChallenge,
    verifyMetaSignature,
} from '../meta/meta-webhook.util';
import { PlatformAdapter } from '../platform-adapter.base';
import {
    MessengerMessagingEvent,
    MessengerSendApiResponse,
    MessengerUserProfile,
    MessengerWebhookPayload,
} from './messenger.types';

const GRAPH_API_BASE = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v21.0';
const MESSAGE_LIMIT = 2000;

@Injectable()
export class MessengerPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE;
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

    private readonly logger = new Logger(MessengerPlatformAdapter.name);
    private readonly apiVersion: string;
    private readonly appSecret: string;
    private readonly verifyToken: string;
    private readonly appId: string;

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
        this.appId = this.config.get<string>('facebook.appId');
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
            refreshToken: account.refreshToken,
            expiresAt: account.tokenExpiresAt,
        }),
        getOwnerProfile: async (account): Promise<PlatformOwnerProfile> => {
            const data = await this.httpGet<{
                id: string;
                name: string;
                picture?: { data?: { url?: string } };
                link?: string;
            }>(this.graphUrl('me'), {
                access_token: this.token(account),
                fields: 'id,name,picture,link',
            });
            return {
                id: data.id,
                name: data.name,
                avatar: data.picture?.data?.url,
                link: data.link,
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
        if (!payload || typeof payload !== 'object') return [];
        if (payload.object !== 'page' || !Array.isArray(payload.entry)) {
            return [];
        }
        const events: PlatformWebhookEvent[] = [];
        for (const entry of payload.entry) {
            for (const event of entry.messaging ?? []) {
                events.push(this.normalizeEvent(entry.id, event));
            }
        }
        return events;
    }

    private normalizeEvent(
        pageId: string,
        event: MessengerMessagingEvent
    ): PlatformWebhookEvent {
        let kind: PlatformWebhookEventKind = 'unknown';
        let externalMessageId: string | undefined;
        let msgText: string | undefined;
        let action: { id: string; value?: string } | undefined;
        let attachments: PlatformWebhookEvent['attachments'];
        let reaction: PlatformWebhookEvent['reaction'];

        if (event.message) {
            kind = event.message.is_echo ? 'echo' : 'message';
            externalMessageId = event.message.mid;
            msgText = event.message.text;
            if (event.message.quick_reply) {
                action = decodeActionPayload(event.message.quick_reply.payload);
            }
            if (event.message.attachments?.length) {
                attachments = event.message.attachments
                    .filter(a => a.type !== 'fallback')
                    .map(a => ({
                        type: a.type as
                            | 'image'
                            | 'video'
                            | 'file'
                            | 'location'
                            | 'sticker'
                            | 'audio',
                        url: a.payload?.url,
                        raw: a,
                    }));
            }
        } else if (event.postback) {
            kind = 'postback';
            externalMessageId = event.postback.mid;
            msgText = event.postback.title;
            action = decodeActionPayload(event.postback.payload);
        } else if (event.reaction) {
            kind = 'reaction';
            externalMessageId = event.reaction.mid;
            reaction = {
                emoji: event.reaction.emoji,
                messageId: event.reaction.mid,
                action: event.reaction.action,
            };
        } else if (event.delivery) {
            kind = 'delivery';
        } else if (event.read) {
            kind = 'read';
        }

        // On an echo the page is the sender and the customer the recipient.
        // Conversations are keyed by the customer everywhere else, so swap the
        // two here and every consumer resolves them the same way.
        const isEcho = kind === 'echo';
        // Matched against our own app id, not merely "some app sent this":
        // Meta Business Suite is an app too, so its echoes carry an app_id
        // while still being an operator typing by hand — exactly the messages
        // this import exists to capture.
        const appId = event.message?.app_id;

        return {
            kind,
            accountKey: pageId,
            senderId: isEcho ? event.recipient.id : event.sender.id,
            recipientId: isEcho ? event.sender.id : event.recipient.id,
            sentByUs:
                isEcho && appId !== undefined
                    ? String(appId) === this.appId
                    : undefined,
            externalMessageId,
            text: msgText,
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
            const data = await this.httpGet<MessengerUserProfile>(
                this.graphUrl(senderId),
                {
                    access_token: this.token(account),
                    fields: 'first_name,last_name,profile_pic',
                }
            );
            const name = [data.first_name, data.last_name]
                .filter(Boolean)
                .join(' ');
            return {
                id: data.id ?? senderId,
                name: name || undefined,
                avatar: data.profile_pic,
                raw: data,
            };
        } catch {
            return { id: senderId };
        }
    }

    async fetchConversations(
        account: AccountEntity,
        senderId: string
    ): Promise<PlatformConversation[]> {
        const data = await this.httpGet<{ data: { id: string }[] }>(
            this.graphUrl('me/conversations'),
            {
                access_token: this.token(account),
                platform: 'messenger',
                user_id: senderId,
            }
        );
        return (data.data ?? []).map(c => ({ id: c.id, raw: c }));
    }

    async fetchMessages(
        account: AccountEntity,
        conversationId: string
    ): Promise<PlatformMessage[]> {
        const data = await this.httpGet<{
            messages: { data: { id: string }[] };
        }>(this.graphUrl(conversationId), {
            access_token: this.token(account),
            fields: 'messages',
        });
        const ids = data.messages?.data ?? [];
        const detailed = await Promise.all(
            ids.map(m =>
                this.httpGet<{
                    id: string;
                    message: string;
                    created_time: string;
                    from: { id: string };
                }>(this.graphUrl(m.id), {
                    access_token: this.token(account),
                    fields: 'id,message,created_time,from,to',
                }).catch(err => {
                    this.logger.warn(
                        `Failed to fetch message ${m.id}: ${err.message}`
                    );
                    return null;
                })
            )
        );
        return detailed
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .map(m => ({
                id: m.id,
                text: m.message,
                from: m.from.id,
                dateSent: new Date(m.created_time),
                raw: m,
            }));
    }

    async reconcile(
        account: AccountEntity,
        lookback: Date
    ): Promise<PlatformWebhookEvent[]> {
        const sinceUnix = Math.floor(lookback.getTime() / 1000);
        const conversationIds: string[] = [];
        let after: string | undefined;
        let pagesFetched = 0;
        const MAX_CONVERSATION_PAGES = 40;

        do {
            const params: Record<string, string> = {
                access_token: this.token(account),
                platform: 'messenger',
                fields: 'id',
                limit: '25',
                since: sinceUnix.toString(),
            };
            if (after) params.after = after;

            const page = await this.httpGet<{
                data: { id: string }[];
                paging?: { cursors?: { after?: string }; next?: string };
            }>(this.graphUrl('me/conversations'), params);

            conversationIds.push(...(page.data ?? []).map(c => c.id));
            after = page.paging?.next ? page.paging.cursors?.after : undefined;
            pagesFetched++;
        } while (after && pagesFetched < MAX_CONVERSATION_PAGES);

        if (after) {
            this.logger.warn(
                `reconcile: conversation list capped at ${MAX_CONVERSATION_PAGES} pages for account ${account.id}`
            );
        }

        const events: PlatformWebhookEvent[] = [];
        for (const convoId of conversationIds) {
            let convoData: {
                messages?: {
                    data: {
                        id: string;
                        created_time: string;
                        from: { id: string };
                        to?: { data?: { id: string }[] };
                        message: string;
                    }[];
                };
            };
            try {
                convoData = await this.httpGet<{
                    messages: {
                        data: {
                            id: string;
                            created_time: string;
                            from: { id: string };
                            to?: { data?: { id: string }[] };
                            message: string;
                        }[];
                    };
                }>(this.graphUrl(convoId), {
                    access_token: this.token(account),
                    // `to` identifies the customer on page-authored messages,
                    // where `from` is the page itself.
                    fields: `messages.since(${sinceUnix}).limit(1000){id,message,created_time,from,to}`,
                });
            } catch (err) {
                this.logger.warn(
                    `reconcile: skip conversation ${convoId}: ${(err as Error).message}`
                );
                continue;
            }
            const rawMsgs = convoData.messages?.data ?? [];
            if (rawMsgs.length >= 1000) {
                this.logger.warn(
                    `reconcile: message list may be truncated at 1000 for conversation ${convoId} — some messages may be missed`
                );
            }
            for (const m of rawMsgs) {
                // A message the page sent is the other half of the thread —
                // an operator's reply, or one of ours. Emit it as an echo so
                // it is stored as outbound rather than replayed as a customer
                // turn, which would have the bot answering itself.
                const fromPage = m.from.id === account.externalId;
                const customerId = fromPage
                    ? m.to?.data?.find(t => t.id !== account.externalId)?.id
                    : m.from.id;
                // No identifiable counterpart (a thread with the page alone,
                // or `to` missing) leaves nothing to key a conversation on.
                if (!customerId) continue;

                events.push({
                    kind: fromPage ? 'echo' : 'message',
                    accountKey: account.externalId,
                    senderId: customerId,
                    recipientId: account.externalId,
                    externalMessageId: m.id,
                    text: m.message,
                    timestamp: new Date(m.created_time),
                    raw: m,
                });
            }
        }
        return events;
    }

    // ----- outbound hooks -----

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

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        const message = this.renderMessage(msg);
        const result = await this.httpPost<MessengerSendApiResponse>(
            this.graphUrl('me/messages'),
            {
                recipient: { id: senderId },
                message,
                messaging_type: 'RESPONSE',
            },
            { access_token: this.token(account) }
        );
        return { externalId: result.message_id };
    }

    protected async doReact(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact'
    ): Promise<void> {
        await this.httpPost(
            this.graphUrl('me/messages'),
            {
                recipient: { id: senderId },
                sender_action: action === 'unreact' ? 'unreact' : 'react',
                payload:
                    action === 'unreact'
                        ? { message_id: externalId }
                        : { message_id: externalId, reaction: emoji },
            },
            { access_token: this.token(account) }
        );
    }

    private renderMessage(msg: OutboundMessage): Record<string, unknown> {
        const c = msg.content;
        let message: Record<string, unknown>;

        if (c.kind === 'text') {
            message = { text: this.truncate(c.text) };
        } else if (c.kind === 'media') {
            message = {
                attachment: {
                    type: c.mediaType === 'file' ? 'file' : c.mediaType,
                    payload: { url: c.url, is_reusable: false },
                },
            };
        } else {
            // card → generic template
            const card = c.card;
            const el: Record<string, unknown> = {
                title: card.title ?? card.body ?? ' ',
                subtitle: card.subtitle ?? card.body,
                image_url: card.imageUrl,
            };
            if (card.buttons?.length) {
                el.buttons = card.buttons.map(b =>
                    b.kind === 'link'
                        ? {
                              type: 'web_url',
                              title: b.label,
                              url: b.url,
                          }
                        : {
                              type: 'postback',
                              title: b.label,
                              payload: encodeActionPayload(b.id, b.value),
                          }
                );
            }
            message = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [el],
                    },
                },
            };
        }

        if (msg.quickReplies?.length) {
            message.quick_replies = msg.quickReplies.slice(0, 13).map(q => ({
                content_type: 'text',
                title: q.label,
                payload: encodeActionPayload(q.id, q.value),
            }));
        }

        return message;
    }

    private truncate(t: string): string {
        const s = this.truncateGraphemes(t, MESSAGE_LIMIT);
        if (!s.trim()) {
            throw new UnprocessableEntityException({
                message: 'platform.error.emptyMessage',
                statusCode: 422,
            });
        }
        return s;
    }

    // ----- private helpers -----

    private async sendAction(
        account: AccountEntity,
        recipientId: string,
        action: 'typing_on' | 'typing_off' | 'mark_seen'
    ): Promise<void> {
        try {
            await this.httpPost(
                this.graphUrl('me/messages'),
                {
                    recipient: { id: recipientId },
                    sender_action: action,
                },
                { access_token: this.token(account) }
            );
        } catch (error) {
            this.logger.warn(
                `Messenger action ${action} failed for ${recipientId}: ${error?.message ?? error}`
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
            this.rethrowPlatformError(error, `Messenger GET ${url}`);
        }
    }

    private async httpPost<T>(
        url: string,
        body: Record<string, unknown>,
        params: Record<string, string>
    ): Promise<T> {
        try {
            const response = await this.httpService.axiosRef.post<T>(
                url,
                body,
                {
                    params,
                }
            );
            return response.data;
        } catch (error) {
            this.rethrowPlatformError(error, `Messenger POST ${url}`);
        }
    }
}
