import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    AdapterCapabilities,
    OutboundMessage,
} from '../../interfaces/message-model';
import {
    PlatformOAuthCapability,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../../interfaces/platform-adapter.interface';
import { PlatformAdapter } from '../platform-adapter.base';

/**
 * The website widget channel.
 *
 * Both halves of the contract are unusual here, for the same reason: there is no
 * third-party platform on the other side, only a browser eccho itself serves.
 *
 * Inbound never arrives through this adapter — a visitor's turn is a
 * synchronous POST handled by WidgetChatService, which streams the reply back on
 * that same request. Outbound reaches this adapter only for messages produced
 * outside that request: an operator's manual reply during handoff, or a
 * follow-up job. Those have no live connection to push down, and the caller has
 * already written the row, so `doSend` has nothing left to do. Delivery is the
 * visitor's poll reading Postgres.
 */
@Injectable()
export class WebsitePlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET;

    // eccho owns this UI, so nothing needs downgrading — unlike Telegram, where
    // `degrade()` has to flatten cards the platform can't render.
    readonly capabilities: AdapterCapabilities = {
        cards: true,
        buttons: true,
        quickReplies: true,
        media: true,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: false, outbound: false },
        typing: false,
        markRead: false,
    };

    // Nothing to authorize against — the operator configures the widget in
    // eccho and embeds a public key.
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
     * Registering the `website` slug also exposes `POST /public/webhooks/website`,
     * which is unauthenticated by design. This channel authenticates visitors by
     * widget key, origin allowlist and Turnstile on its own controller, so
     * accepting anything here would be a free message-injection endpoint.
     */
    verifySignature(
        _rawBody: string,
        _headers: Headers | Record<string, string>
    ): boolean {
        return false;
    }

    /** Unreachable: nothing routes a webhook body to this channel. */
    parse(_rawBody: string): PlatformWebhookEvent[] {
        return [];
    }

    // ─── fetch ───────────────────────────────────────────────────────────────

    /**
     * Visitors are anonymous by design — the id is a value their own browser
     * generated, and there is no directory to look it up in.
     */
    async fetchSenderProfile(
        _account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        return { id: senderId };
    }

    // ─── outbound ────────────────────────────────────────────────────────────

    protected async doSend(
        _account: AccountEntity,
        _senderId: string,
        _msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        // No push transport exists. The row is already written by the caller
        // (ConversationMessagingService / ReplyGenerationService), and the
        // visitor's poll picks it up. This is the single seam a future standing
        // SSE or pub/sub delivery would fill — every caller already funnels
        // through sendMessage(), so nothing above needs to change for that.
        return { externalId: randomUUID() };
    }
}
