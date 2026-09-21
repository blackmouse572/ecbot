import { registerAs } from '@nestjs/config';

export default registerAs(
    'chatbot',
    (): Record<string, any> => ({
        // Signed, time-limited public preview links (issue #80).
        share: {
            // HS256 secret. Unset means share-link creation fails loudly.
            secret: process.env.CHATBOT_PREVIEW_SHARE_TOKEN_SECRET_KEY,
            // Upper bound on a caller-requested expiry. A share link cannot be
            // revoked, so a long-lived leaked link is live until it expires.
            maxExpiresInMs: 7 * 24 * 60 * 60 * 1000,
        },
        // Ephemeral preview transcript kept in Redis (cache-manager, ms TTL).
        session: {
            ttlMs: 30 * 60 * 1000,
            // Turns kept as model context; oldest are dropped past this.
            maxTurns: 12,
            // Hard ceiling on the history payload sent to apps/ai.
            maxTotalChars: 8000,
            // Rejected with 400 above this — never silently truncated.
            maxMessageChars: 2000,
            // Cost ceiling per session and per share token (public path).
            maxTurnsPerSession: 30,
            maxTurnsPerTokenHourly: 100,
        },
    })
);
