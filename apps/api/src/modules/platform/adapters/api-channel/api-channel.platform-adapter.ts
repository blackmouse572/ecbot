import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { isApiChannelAccount } from '@app/modules/account/interfaces/account-config.interface';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import {
    Injectable,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    API_CHANNEL_CALLBACK_BACKOFF_MS,
    API_CHANNEL_CALLBACK_MAX_ATTEMPTS,
} from '../../constants/api-channel-callback.constant';
import {
    AdapterCapabilities,
    OutboundMessage,
} from '../../interfaces/message-model';
import {
    PlatformOAuthCapability,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../../interfaces/platform-adapter.interface';
import {
    ApiChannelCallbackPayload,
    ApiChannelCallbackService,
} from '../../services/api-channel-callback.service';
import { PlatformAdapter } from '../platform-adapter.base';
import { ENUM_API_CHANNEL_STATUS_CODE_ERROR } from '../../enums/api-channel.status-code.enum';

/** Body a third party POSTs to `/client/channels/api/messages`. */
interface ApiChannelInboundBody {
    accountKey?: string;
    senderId?: string;
    text?: string;
    messageId?: string;
    timestamp?: string;
}

/**
 * The API channel — a third party talks to a chatbot over plain REST instead of
 * a chat platform. Inbound is authenticated by ClientCredentialGuard on the
 * `/client` surface (ADR-0012), not by a platform HMAC; outbound POSTs the
 * reply to the account's own callback URL, signed so the receiver can verify it.
 */
@Injectable()
export class ApiChannelPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.API_CHANNEL;

    // Text only for now. `degrade()` collapses richer content, so enabling a
    // capability later needs no structural change — just an honest flag.
    readonly capabilities: AdapterCapabilities = {
        cards: false,
        buttons: false,
        quickReplies: false,
        media: false,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: false, outbound: false },
        typing: false,
        markRead: false,
    };

    private readonly logger = new Logger(ApiChannelPlatformAdapter.name);

    constructor(
        private readonly accountService: AccountService,
        private readonly callbackService: ApiChannelCallbackService
    ) {
        super();
    }

    // ─── oauth ───────────────────────────────────────────────────────────────

    // No third-party authorization exists — eccho issues the credentials itself.
    // Stubbed the same way Telegram's is; nothing on the link path calls it.
    readonly oauth: PlatformOAuthCapability = {
        exchangeCode: async () => ({ accessToken: '' }),
        refresh: async () => ({ accessToken: '' }),
        getOwnerProfile: async account => ({
            id: account.externalId,
            name: account.name,
        }),
    };

    // ─── inbound ─────────────────────────────────────────────────────────────

    verifyChallenge(_req: Request): Response | null {
        return null;
    }

    /**
     * Always false — deliberately.
     *
     * The `api` slug is registered so the channel is addressable, which also
     * exposes `POST /public/webhooks/api`. That route is unauthenticated by
     * design (platforms authenticate with their own signatures) and this channel
     * has no such signature: its callers authenticate with a ClientCredential on
     * `/client`. Returning true here would turn the public webhook into an
     * unauthenticated message-injection endpoint, so it always rejects.
     */
    verifySignature(
        _rawBody: string,
        _headers: Headers | Record<string, string>
    ): boolean {
        return false;
    }

    parse(rawBody: string): PlatformWebhookEvent[] {
        let body: ApiChannelInboundBody;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return [];
        }
        if (!body || typeof body !== 'object') return [];
        if (!body.accountKey || !body.senderId) return [];

        // A caller that supplies no messageId gets a minted one; without it the
        // Inbound Inbox drops the event as undedupable.
        const externalMessageId = body.messageId ?? randomUUID();

        return [
            {
                kind: 'message',
                accountKey: body.accountKey,
                senderId: body.senderId,
                recipientId: body.accountKey,
                externalMessageId,
                text: body.text,
                timestamp: body.timestamp
                    ? new Date(body.timestamp)
                    : new Date(),
                raw: body,
            },
        ];
    }

    // ─── fetch ───────────────────────────────────────────────────────────────

    /**
     * There is no directory to look a sender up in — the third party owns its
     * own user identities and only ever hands us an opaque id.
     */
    async fetchSenderProfile(
        _account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        return { id: senderId };
    }

    // ─── outbound ────────────────────────────────────────────────────────────

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        if (!isApiChannelAccount(account) || !account.config.callbackUrl) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_API_CHANNEL_STATUS_CODE_ERROR.CALLBACK_URL_MISSING,
                message: 'account.error.apiChannelCallbackUrlMissing',
            });
        }

        const externalId = randomUUID();
        const payload: ApiChannelCallbackPayload = {
            accountKey: account.externalId,
            senderId,
            externalId,
            text: this.flatten(msg),
            timestamp: new Date().toISOString(),
        };

        try {
            await this.callbackService.deliver(account, payload);
        } catch (error) {
            // The reply is already persisted by the caller; a receiver being down
            // must not fail the turn. Retry in-process with backoff instead of
            // blocking the reply pipeline — a restart drops any retry still in
            // flight, which is acceptable for a best-effort third-party callback.
            this.logger.warn(
                `API channel callback failed for account ${account.id}, retrying in-process: ${error}`
            );
            this.retryDeliver(account.id, payload).catch(() => {});
        }

        return { externalId };
    }

    private async retryDeliver(
        accountId: string,
        payload: ApiChannelCallbackPayload
    ): Promise<void> {
        for (
            let attempt = 2;
            attempt <= API_CHANNEL_CALLBACK_MAX_ATTEMPTS;
            attempt++
        ) {
            await sleep(
                API_CHANNEL_CALLBACK_BACKOFF_MS * 2 ** (attempt - 2)
            );

            // Re-read the account so a callbackUrl or rotated secret changed
            // since the first attempt takes effect on this retry.
            const account = await this.accountService.findOne({
                id: accountId,
            });
            if (!account) {
                this.logger.warn(
                    `Dropping API channel callback for missing account ${accountId}`
                );
                return;
            }

            try {
                await this.callbackService.deliver(account, payload);
                return;
            } catch (error) {
                this.logger.warn(
                    `API channel callback retry ${attempt}/${API_CHANNEL_CALLBACK_MAX_ATTEMPTS} failed for account ${accountId}: ${error}`
                );
            }
        }

        // No queue retention to inspect a permanently-failing callback URL
        // anymore — this is the one durable signal that all attempts died.
        this.logger.error(
            `API channel callback exhausted all ${API_CHANNEL_CALLBACK_MAX_ATTEMPTS} attempts for account ${accountId}, externalId ${payload.externalId} — giving up`
        );
    }

    /** `degrade()` has already collapsed richer content by the time we get here. */
    private flatten(msg: OutboundMessage): string {
        if (msg.content.kind === 'text') return msg.content.text;
        return msg.fallbackText;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms).unref());
}
