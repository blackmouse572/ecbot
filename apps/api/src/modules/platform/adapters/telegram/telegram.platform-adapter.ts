import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { IMessageMedia } from '@app/modules/conversation/interfaces/message-media.interface';
import { MESSAGE_MEDIA_MAX_BYTES } from '@app/modules/conversation/constants/message-media.constant';
import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import {
    AdapterCapabilities,
    OutboundMessage,
} from '../../interfaces/message-model';
import {
    PlatformConversation,
    PlatformMessage,
    PlatformOAuthCapability,
    PlatformOAuthTokens,
    PlatformOwnerProfile,
    PlatformAttachment,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../../interfaces/platform-adapter.interface';
import { PlatformAdapter } from '../platform-adapter.base';

// ─── Telegram Bot API types ───────────────────────────────────────────────────

interface TelegramResponse<T> {
    ok: boolean;
    result?: T;
    description?: string;
}

interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

interface TelegramChat {
    id: number;
    type: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo?: { small_file_id: string };
}

interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    caption?: string;
    photo?: { file_id: string; file_unique_id: string }[];
    video?: { file_id: string };
    document?: { file_id: string; file_name?: string };
    audio?: { file_id: string };
    voice?: { file_id: string };
    sticker?: { file_id: string };
    location?: { latitude: number; longitude: number };
}

interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
}

interface TelegramReactionType {
    type: string; // 'emoji' | 'custom_emoji' | 'paid'
    emoji?: string;
    custom_emoji_id?: string;
}

interface TelegramMessageReactionUpdated {
    chat: TelegramChat;
    message_id: number;
    user?: TelegramUser;
    actor_chat?: TelegramChat;
    date: number;
    old_reaction: TelegramReactionType[];
    new_reaction: TelegramReactionType[];
}

interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
    message_reaction?: TelegramMessageReactionUpdated;
}

interface TelegramSendMessageResponse {
    message_id: number;
    chat: TelegramChat;
}

@Injectable()
export class TelegramPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.TELEGRAM_BOT;
    readonly capabilities: AdapterCapabilities = {
        cards: false,
        buttons: false,
        quickReplies: false,
        media: true,
        editMessage: true,
        deleteMessage: true,
        reactions: { inbound: true, outbound: true },
        typing: true,
        markRead: false,
    };

    private readonly logger = new Logger(TelegramPlatformAdapter.name);
    private readonly apiUrl: string;
    private readonly webhookSecretToken: string;

    constructor(
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
        private readonly accountService: AccountService
    ) {
        super();
        this.apiUrl =
            config.get<string>('telegram.apiUrl') ?? 'https://api.telegram.org';
        this.webhookSecretToken =
            config.get<string>('telegram.webhookSecretToken') ?? '';
    }

    private token(account: AccountEntity): string {
        return this.accountService.decryptToken(account.accessToken);
    }

    private botUrl(account: AccountEntity, method: string): string {
        return `${this.apiUrl}/bot${this.token(account)}/${method}`;
    }

    // ─── oauth ───────────────────────────────────────────────────────────────

    readonly oauth: PlatformOAuthCapability = {
        exchangeCode: async (): Promise<PlatformOAuthTokens> => ({
            accessToken: '',
        }),
        refresh: async (account): Promise<PlatformOAuthTokens> => ({
            accessToken: this.token(account),
        }),
        getOwnerProfile: async (account): Promise<PlatformOwnerProfile> => {
            const res = await this.httpService.axiosRef.get<
                TelegramResponse<TelegramUser>
            >(this.botUrl(account, 'getMe'));
            this.assertOk(res.data);
            const bot = res.data.result!;
            return {
                id: bot.id.toString(),
                name: bot.first_name,
                link: bot.username ? `https://t.me/${bot.username}` : undefined,
            };
        },
    };

    // ─── inbound ─────────────────────────────────────────────────────────────

    verifyChallenge(_req: Request): Response | null {
        return null;
    }

    verifySignature(
        _rawBody: string,
        headers: Headers | Record<string, string>
    ): boolean {
        // Reject immediately if no valid secret is configured — without a secret,
        // Telegram won't include the header so every request would be unauthenticated.
        if (
            !this.webhookSecretToken ||
            !/^[A-Za-z0-9_-]{1,256}$/.test(this.webhookSecretToken)
        ) {
            return false;
        }
        const incoming =
            headers instanceof Headers
                ? headers.get('x-telegram-bot-api-secret-token')
                : (headers['x-telegram-bot-api-secret-token'] ??
                  headers['X-Telegram-Bot-Api-Secret-Token']);
        if (!incoming) return false;
        // Hash both to fixed length before timingSafeEqual — avoids RangeError
        // and eliminates length-based timing leak.
        const a = createHash('sha256').update(incoming).digest();
        const b = createHash('sha256').update(this.webhookSecretToken).digest();
        return timingSafeEqual(a, b);
    }

    parse(rawBody: string): PlatformWebhookEvent[] {
        let update: TelegramUpdate;
        try {
            update = JSON.parse(rawBody);
        } catch {
            return [];
        }
        if (!update || typeof update !== 'object') return [];

        const msg = update.message ?? update.edited_message;
        if (msg) {
            return [this.normalizeMessage(msg, !!update.edited_message)];
        }

        if (update.callback_query) {
            return [this.normalizeCallbackQuery(update.callback_query)];
        }

        if (update.message_reaction) {
            return [this.normalizeMessageReaction(update.message_reaction)];
        }

        return [];
    }

    private normalizeMessage(
        msg: TelegramMessage,
        isEdit: boolean
    ): PlatformWebhookEvent {
        const senderId = (msg.from?.id ?? msg.chat.id).toString();
        const recipientId = msg.chat.id.toString();

        let attachments: PlatformWebhookEvent['attachments'];
        if (msg.photo?.length) {
            const largest = msg.photo[msg.photo.length - 1];
            attachments = [{ type: 'image', raw: largest }];
        } else if (msg.video) {
            attachments = [{ type: 'video', raw: msg.video }];
        } else if (msg.document) {
            attachments = [{ type: 'file', raw: msg.document }];
        } else if (msg.audio || msg.voice) {
            attachments = [{ type: 'audio', raw: msg.audio ?? msg.voice }];
        } else if (msg.sticker) {
            attachments = [{ type: 'sticker', raw: msg.sticker }];
        } else if (msg.location) {
            attachments = [{ type: 'location', raw: msg.location }];
        }

        return {
            kind: isEdit ? 'unknown' : 'message',
            accountKey: recipientId,
            senderId,
            recipientId,
            externalMessageId: msg.message_id.toString(),
            text: msg.text ?? msg.caption,
            timestamp: new Date(msg.date * 1000),
            raw: msg,
            attachments,
        };
    }

    private normalizeMessageReaction(
        r: TelegramMessageReactionUpdated
    ): PlatformWebhookEvent {
        const senderId = (r.user?.id ?? r.chat.id).toString();
        const recipientId = r.chat.id.toString();
        const emoji =
            r.new_reaction[0]?.emoji ?? r.old_reaction[0]?.emoji ?? '';

        return {
            kind: 'reaction',
            accountKey: recipientId,
            senderId,
            recipientId,
            externalMessageId: String(r.message_id),
            timestamp: new Date(r.date * 1000),
            raw: r,
            reaction: {
                emoji,
                messageId: String(r.message_id),
                action: r.new_reaction.length ? 'react' : 'unreact',
            },
        };
    }

    private normalizeCallbackQuery(
        cb: TelegramCallbackQuery
    ): PlatformWebhookEvent {
        const senderId = cb.from.id.toString();
        const recipientId = cb.message?.chat.id.toString() ?? senderId;
        return {
            kind: 'postback',
            accountKey: recipientId,
            senderId,
            recipientId,
            externalMessageId: cb.id,
            text: cb.data,
            timestamp: cb.message
                ? new Date(cb.message.date * 1000)
                : new Date(),
            raw: cb,
            action: cb.data ? { id: cb.data } : undefined,
        };
    }

    // ─── fetch ───────────────────────────────────────────────────────────────

    async fetchSenderProfile(
        account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        try {
            const res = await this.httpService.axiosRef.post<
                TelegramResponse<TelegramChat>
            >(this.botUrl(account, 'getChat'), { chat_id: senderId });
            const chat = res.data.result;
            if (!res.data.ok || !chat) return { id: senderId };
            const name = [chat.first_name, chat.last_name]
                .filter(Boolean)
                .join(' ');
            return {
                id: chat.id.toString(),
                name: name || chat.username || undefined,
                raw: chat,
            };
        } catch {
            return { id: senderId };
        }
    }

    /** Photos arrive as a file id: resolve it with getFile, then download.
     *  (The download URL embeds the bot token — never store or expose it.) */
    async fetchMedia(
        account: AccountEntity,
        attachment: PlatformAttachment
    ): Promise<IMessageMedia | null> {
        const fileId = (attachment.raw as { file_id?: string } | undefined)
            ?.file_id;
        if (!fileId) return null;
        const res = await this.httpService.axiosRef.post<
            TelegramResponse<{ file_path?: string }>
        >(this.botUrl(account, 'getFile'), { file_id: fileId });
        const filePath = res.data.result?.file_path;
        if (!res.data.ok || !filePath) return null;
        const file = await this.httpService.axiosRef.get<ArrayBuffer>(
            `${this.apiUrl}/file/bot${this.token(account)}/${filePath}`,
            {
                responseType: 'arraybuffer',
                // Aborts mid-download, not after buffering the whole file.
                maxContentLength: MESSAGE_MEDIA_MAX_BYTES,
            }
        );
        return {
            data: Buffer.from(file.data),
            mime: String(file.headers?.['content-type'] ?? 'image/jpeg'),
        };
    }

    // Telegram Bot API does not expose conversation history — bots only receive new updates.
    fetchConversations(
        _account: AccountEntity,
        _senderId: string
    ): Promise<PlatformConversation[]> {
        return Promise.resolve([]);
    }

    fetchMessages(
        _account: AccountEntity,
        _conversationId: string
    ): Promise<PlatformMessage[]> {
        return Promise.resolve([]);
    }

    // ─── outbound ────────────────────────────────────────────────────────────

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        const c = msg.content;

        let result: TelegramSendMessageResponse;

        if (c.kind === 'media') {
            const methodMap = {
                image: 'sendPhoto',
                video: 'sendVideo',
                file: 'sendDocument',
            } as const;
            const method = methodMap[c.mediaType] ?? 'sendDocument';
            const fileField =
                { image: 'photo', video: 'video', file: 'document' }[
                    c.mediaType
                ] ?? 'document';
            const res = await this.httpService.axiosRef.post<
                TelegramResponse<TelegramSendMessageResponse>
            >(this.botUrl(account, method), {
                chat_id: senderId,
                [fileField]: c.url,
                caption: c.caption,
            });
            this.assertOk(res.data);
            result = res.data.result!;
        } else {
            const text = c.kind === 'text' ? c.text : msg.fallbackText;
            const res = await this.httpService.axiosRef.post<
                TelegramResponse<TelegramSendMessageResponse>
            >(this.botUrl(account, 'sendMessage'), { chat_id: senderId, text });
            this.assertOk(res.data);
            result = res.data.result!;
        }

        return { externalId: result.message_id.toString() };
    }

    protected async doTyping(
        account: AccountEntity,
        senderId: string,
        on: boolean
    ): Promise<void> {
        if (!on) return;
        try {
            await this.httpService.axiosRef.post(
                this.botUrl(account, 'sendChatAction'),
                { chat_id: senderId, action: 'typing' }
            );
        } catch (err) {
            this.logger.warn(`Telegram typing action failed: ${err?.message}`);
        }
    }

    protected async doEdit(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        msg: OutboundMessage
    ): Promise<void> {
        if (msg.content.kind === 'media') {
            await this.httpService.axiosRef.post(
                this.botUrl(account, 'editMessageCaption'),
                {
                    chat_id: senderId,
                    message_id: Number(externalId),
                    caption: msg.content.caption,
                }
            );
        } else {
            const text =
                msg.content.kind === 'text'
                    ? msg.content.text
                    : msg.fallbackText;
            await this.httpService.axiosRef.post(
                this.botUrl(account, 'editMessageText'),
                { chat_id: senderId, message_id: Number(externalId), text }
            );
        }
    }

    protected async doDelete(
        account: AccountEntity,
        senderId: string,
        externalId: string
    ): Promise<void> {
        await this.httpService.axiosRef.post(
            this.botUrl(account, 'deleteMessage'),
            { chat_id: senderId, message_id: Number(externalId) }
        );
    }

    protected async doReact(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact'
    ): Promise<void> {
        try {
            await this.httpService.axiosRef.post(
                this.botUrl(account, 'setMessageReaction'),
                {
                    chat_id: senderId,
                    message_id: Number(externalId),
                    reaction:
                        action === 'unreact' ? [] : [{ type: 'emoji', emoji }],
                }
            );
        } catch (error) {
            this.rethrowPlatformError(error, 'Telegram setMessageReaction');
        }
    }

    private assertOk<T>(res: TelegramResponse<T>): void {
        if (!res.ok || !res.result) {
            throw new UnprocessableEntityException({
                message: 'telegram.error.apiError',
                description: res.description,
            });
        }
    }
}
