/** Why a platform send failed, as far as the channel's health is concerned. */
export enum ENUM_SEND_FAILURE {
    /** The token was revoked or expired: every send will fail until reconnect. */
    AUTH = 'auth',
    /** The request never landed (network, 5xx, rate limit): safe to resend. */
    TRANSIENT = 'transient',
    /** About this one customer or message (blocked the page, 24h window), not the channel. */
    RECIPIENT = 'recipient',
    /** Anything else, including a timeout the platform may have acted on. */
    OTHER = 'other',
}

/** The kind of channel alert sent to the workspace. */
export enum ENUM_CHANNEL_ALERT {
    AUTH_FAILED = 'auth_failed',
    SEND_FAILING = 'send_failing',
    RECOVERED = 'recovered',
}

/** Waits before each resend of a TRANSIENT failure; two resends in all. */
export const SEND_RETRY_DELAYS_MS = [2_000, 10_000];

/** Failures in a row (after resends) that open a SEND_FAILING alert. */
export const CHANNEL_FAILURE_THRESHOLD = 3;

/** The window those failures must fall in. */
export const CHANNEL_FAILURE_WINDOW_SECONDS = 15 * 60;

/** While a channel stays down, the workspace is reminded at most this often. */
export const CHANNEL_ALERT_REMIND_SECONDS = 6 * 60 * 60;

export const CHANNEL_HEALTH_KEY_PREFIX = 'channel-health';

/** lastSendError is a varchar(500). */
export const CHANNEL_LAST_ERROR_MAX_LENGTH = 500;

// Meta Graph error codes (Messenger, Instagram, WhatsApp).
export const META_AUTH_CODES = new Set([190, 102]);
export const META_TRANSIENT_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);
// 10: outside the 24h window; 551: person unavailable; 131047 / 131026:
// WhatsApp re-engagement and undeliverable; subcode 2018001: no such user.
export const META_RECIPIENT_CODES = new Set([10, 551, 131047, 131026]);
export const META_RECIPIENT_SUBCODES = new Set([2018001, 2018278, 2018108]);

// Zalo OA error codes, returned with HTTP 200.
export const ZALO_AUTH_CODES = new Set([-216, -124]);
// -213: not following the OA; -230 / -232: outside the interaction window.
export const ZALO_RECIPIENT_CODES = new Set([-213, -230, -232]);

// Failed before the request left: nothing reached the platform.
export const NETWORK_TRANSIENT_CODES = new Set([
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
]);
