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
import { createHash, timingSafeEqual } from 'crypto';
import {
    AdapterCapabilities,
    OutboundMessage,
} from '../../interfaces/message-model';
import {
    PlatformOAuthCapability,
    PlatformOAuthTokens,
    PlatformOwnerProfile,
    PlatformUserProfile,
    PlatformWebhookEvent,
    PlatformWebhookEventKind,
} from '../../interfaces/platform-adapter.interface';
import { PlatformAdapter } from '../platform-adapter.base';
import {
    ZaloApiResponse,
    ZaloOaInfoData,
    ZaloSendMessageData,
    ZaloUserProfileData,
    ZaloWebhookAttachment,
    ZaloWebhookPayload,
} from './zalo.types';

const OPENAPI_BASE = 'https://openapi.zalo.me/v3.0/oa';
const MESSAGE_LIMIT = 2000;
// Reject webhooks whose (signed) timestamp is older than this — replay guard.
const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

@Injectable()
export class ZaloPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.ZALO_PAGE;
    // First-pass scope: text-only outbound. Zalo OA *does* support images,
    // files, stickers and templates via the CS API — enabling those is a
    // tracked follow-up. Until then all capabilities are false so degrade()
    // collapses richer content to plain text.
    readonly capabilities: AdapterCapabilities = {
        cards: false,
        buttons: false,
        quickReplies: false,
        media: false,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: true, outbound: true },
        typing: false,
        markRead: false,
    };

    private readonly logger = new Logger(ZaloPlatformAdapter.name);
    private readonly appId: string;
    private readonly appSecret: string;

    constructor(
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
        private readonly accountService: AccountService
    ) {
        super();
        this.appId = this.config.get<string>('oauth.zalo.appId');
        this.appSecret = this.config.get<string>('oauth.zalo.appSecret');
    }

    private token(account: AccountEntity): string {
        return this.accountService.decryptToken(account.accessToken);
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
            const res = await this.httpGet<ZaloApiResponse<ZaloOaInfoData>>(
                `${OPENAPI_BASE}/getoa`,
                this.token(account)
            );
            const data = res.data ?? {};
            return {
                id: data.oa_id ?? account.externalId,
                name: data.name ?? '',
                avatar: data.avatar,
                link: data.oa_alias
                    ? `https://zalo.me/${data.oa_alias}`
                    : undefined,
            };
        },
    };

    // ----- webhook -----

    // Zalo has no GET challenge handshake — controller responds 404 for GET.
    verifyChallenge(): Response | null {
        return null;
    }

    verifySignature(
        rawBody: string,
        headers: Headers | Record<string, string>
    ): boolean {
        if (!this.appSecret || !this.appId) return false;
        const header =
            headers instanceof Headers
                ? headers.get('x-zevent-signature')
                : (headers['x-zevent-signature'] ??
                  headers['X-ZEvent-Signature']);
        if (!header) return false;
        // Header format: "mac=<sha256hex>"
        const mac = header.startsWith('mac=') ? header.slice(4) : header;
        let timestamp: string;
        try {
            timestamp = String(
                (JSON.parse(rawBody) as ZaloWebhookPayload).timestamp ?? ''
            );
        } catch {
            return false;
        }
        // mac = SHA256(appId + rawBody + timestamp + OASecretKey)
        const expected = createHash('sha256')
            .update(this.appId + rawBody + timestamp + this.appSecret, 'utf8')
            .digest('hex');
        let sigOk: boolean;
        try {
            sigOk = timingSafeEqual(
                Buffer.from(mac, 'hex'),
                Buffer.from(expected, 'hex')
            );
        } catch {
            return false;
        }
        if (!sigOk) return false;
        // Replay guard: timestamp is part of the signed string (unforgeable),
        // so reject anything outside the freshness window.
        const ageMs = Math.abs(Date.now() - Number(timestamp));
        return Number.isFinite(ageMs) && ageMs <= WEBHOOK_MAX_AGE_MS;
    }

    parse(rawBody: string): PlatformWebhookEvent[] {
        let payload: ZaloWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return [];
        }
        if (!payload || typeof payload !== 'object' || !payload.sender?.id) {
            return [];
        }
        return [this.normalizeEvent(payload)];
    }

    private normalizeEvent(payload: ZaloWebhookPayload): PlatformWebhookEvent {
        const eventName = payload.event_name ?? '';
        let kind: PlatformWebhookEventKind = 'unknown';
        if (eventName.startsWith('oa_send')) kind = 'echo';
        else if (eventName === 'user_seen_message') kind = 'read';
        else if (eventName === 'user_received_message') kind = 'delivery';
        // UNCONFIRMED event name — see ZaloWebhookPayload.reaction jsdoc in
        // zalo.types.ts. Best-effort match on the documented "user reacts to
        // message" event; verify against a captured payload.
        else if (eventName === 'user_react_message') kind = 'reaction';
        else if (eventName.startsWith('user_send')) kind = 'message';

        const attachments = this.mapAttachments(payload.message?.attachments);
        const reactedMessageId =
            payload.reaction?.r_msg_id ?? payload.message?.msg_id;

        return {
            kind,
            accountKey: payload.recipient?.id ?? payload.oa_id ?? '',
            senderId: payload.sender.id,
            recipientId: payload.recipient?.id ?? '',
            externalMessageId:
                kind === 'reaction'
                    ? reactedMessageId
                    : payload.message?.msg_id,
            text: payload.message?.text,
            timestamp: this.toDate(payload.timestamp),
            raw: payload,
            attachments,
            reaction:
                kind === 'reaction' && reactedMessageId
                    ? {
                          emoji: String(
                              payload.reaction?.icon ??
                                  payload.reaction?.type ??
                                  ''
                          ),
                          messageId: reactedMessageId,
                          // UNCONFIRMED: no known payload field distinguishes
                          // react vs. unreact for Zalo. Defensive heuristic:
                          // an empty icon/type is treated as an unreact.
                          action:
                              payload.reaction?.icon || payload.reaction?.type
                                  ? 'react'
                                  : 'unreact',
                      }
                    : undefined,
        };
    }

    private mapAttachments(
        attachments?: ZaloWebhookAttachment[]
    ): PlatformWebhookEvent['attachments'] {
        if (!attachments?.length) return undefined;
        return attachments.map(a => ({
            type: this.mapAttachmentType(a.type),
            url: a.payload?.url,
            raw: a,
        }));
    }

    private mapAttachmentType(
        type?: string
    ): NonNullable<PlatformWebhookEvent['attachments']>[number]['type'] {
        switch (type) {
            case 'image':
            case 'gif':
                return 'image';
            case 'video':
                return 'video';
            case 'audio':
                return 'audio';
            case 'sticker':
                return 'sticker';
            case 'location':
                return 'location';
            default:
                return 'file';
        }
    }

    private toDate(timestamp?: string): Date {
        const ms = Number(timestamp);
        return Number.isFinite(ms) && ms > 0 ? new Date(ms) : new Date();
    }

    // ----- fetch -----

    async fetchSenderProfile(
        account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        try {
            const res = await this.httpGet<
                ZaloApiResponse<ZaloUserProfileData>
            >(`${OPENAPI_BASE}/getprofile`, this.token(account), {
                data: JSON.stringify({ user_id: senderId }),
            });
            const data = res.data ?? {};
            return {
                id: data.user_id ?? senderId,
                name: data.display_name || undefined,
                avatar: data.avatar,
                raw: data,
            };
        } catch (error) {
            this.logger.warn(
                `Zalo fetchSenderProfile failed for ${senderId}: ${error?.message ?? error}`
            );
            return { id: senderId };
        }
    }

    // ----- outbound -----

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        // capabilities are all false → degrade() collapses everything to text.
        const text =
            msg.content.kind === 'text' ? msg.content.text : msg.fallbackText;
        const res = await this.httpPost<ZaloApiResponse<ZaloSendMessageData>>(
            `${OPENAPI_BASE}/message/cs`,
            {
                recipient: { user_id: senderId },
                message: { text: this.truncate(text) },
            },
            this.token(account)
        );
        if (res.error !== 0) {
            throw new UnprocessableEntityException({
                message: 'platform.error.sendFailed',
                statusCode: 422,
                errors: {
                    provider: 'zalo',
                    error: res.error,
                    detail: res.message,
                },
            });
        }
        return { externalId: res.data?.message_id ?? '' };
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

    // UNCONFIRMED: no fixture/doc body was accessible while implementing this
    // (see
    // https://developers.zalo.me/docs/official-account/tin-nhan/cac-loai-tin-khac/tha-bieu-tuong-cam-xuc-vao-tin-nhan
    // — the page only rendered a title, not the API reference). The endpoint
    // path and body field names below are a best-effort guess mirroring the
    // `message/cs` send-message shape; verify against a real request/response
    // before relying on this in production and update `zalo.types.ts` /
    // add a fixture once confirmed.
    //
    // Zalo does not document an "unreact" operation anywhere accessible to
    // us, so only 'react' is implemented — 'unreact' is a no-op.
    protected async doReact(
        account: AccountEntity,
        senderId: string,
        externalId: string,
        emoji: string,
        action: 'react' | 'unreact'
    ): Promise<void> {
        if (action === 'unreact') {
            this.logger.warn(
                'Zalo doReact: "unreact" is not documented by Zalo OA — skipping'
            );
            return;
        }

        const res = await this.httpPost<ZaloApiResponse<unknown>>(
            `${OPENAPI_BASE}/message/reaction`,
            {
                recipient: { user_id: senderId },
                reaction: { message_id: externalId, icon: emoji },
            },
            this.token(account)
        );
        if (res.error !== 0) {
            throw new UnprocessableEntityException({
                message: 'platform.error.reactFailed',
                statusCode: 422,
                errors: {
                    provider: 'zalo',
                    error: res.error,
                    detail: res.message,
                },
            });
        }
    }

    // ----- http helpers -----

    private async httpGet<T>(
        url: string,
        accessToken: string,
        params?: Record<string, string>
    ): Promise<T> {
        const response = await this.httpService.axiosRef.get<T>(url, {
            params,
            headers: { access_token: accessToken },
        });
        return response.data;
    }

    private async httpPost<T>(
        url: string,
        body: Record<string, unknown>,
        accessToken: string
    ): Promise<T> {
        try {
            const response = await this.httpService.axiosRef.post<T>(
                url,
                body,
                {
                    headers: {
                        access_token: accessToken,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error) {
            this.rethrowPlatformError(error, `Zalo POST ${url}`);
        }
    }
}
