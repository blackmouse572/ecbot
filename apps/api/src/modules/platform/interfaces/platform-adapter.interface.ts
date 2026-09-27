import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';

export interface PlatformOAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export interface PlatformOwnerProfile {
    id: string;
    name: string;
    avatar?: string;
    link?: string;
}

export interface PlatformUserProfile {
    id: string;
    name?: string;
    avatar?: string;
    raw?: unknown;
}

export interface PlatformConversation {
    id: string;
    raw?: unknown;
}

export interface PlatformMessage {
    id: string;
    text: string;
    from: string;
    dateSent: Date;
    raw?: unknown;
}

export type PlatformWebhookEventKind =
    | 'message'
    | 'echo'
    | 'postback'
    | 'reaction'
    | 'delivery'
    | 'read'
    | 'unknown';

export interface PlatformAttachment {
    type: 'image' | 'video' | 'file' | 'location' | 'sticker' | 'audio';
    url?: string;
    raw?: unknown;
}

export interface PlatformWebhookEvent {
    kind: PlatformWebhookEventKind;
    accountKey: string; // page id / oa id / shop id — the account.externalId
    /**
     * The customer this conversation is with — always, including on 'echo',
     * where the platform payload has the customer as the recipient because
     * the page is the one sending. Adapters normalise so every consumer can
     * resolve the conversation the same way.
     */
    senderId: string;
    recipientId: string;
    /**
     * Display name the platform ships inside the webhook itself. Used when
     * `fetchSenderProfile` cannot supply one (WhatsApp has no profile lookup).
     */
    senderName?: string;
    /**
     * 'echo' only: the message came from *our* app's send API, so we already
     * persisted it at send time and must not store it twice. Deliberately not
     * "some app sent this" — the platform's own tools (Meta Business Suite)
     * are apps too, and a human typing there is precisely what this import is
     * for.
     */
    sentByUs?: boolean;
    externalMessageId?: string;
    text?: string;
    timestamp: Date;
    raw: unknown;
    // structured inbound extras (optional — parsers fill when present)
    action?: { id: string; value?: string };
    attachments?: PlatformAttachment[];
    reaction?: {
        emoji: string;
        messageId: string;
        action: 'react' | 'unreact';
    };
}

export interface PlatformOAuthCapability {
    exchangeCode(
        code: string,
        redirectUri?: string
    ): Promise<PlatformOAuthTokens>;
    refresh(account: AccountEntity): Promise<PlatformOAuthTokens>;
    getOwnerProfile(account: AccountEntity): Promise<PlatformOwnerProfile>;
}

export const PLATFORM_ADAPTER = Symbol('PLATFORM_ADAPTER');
