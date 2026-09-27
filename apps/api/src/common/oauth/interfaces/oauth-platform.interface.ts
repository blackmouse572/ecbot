export interface IOAuthTokenResult {
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    externalId: string;
    name: string;
    avatar?: string;
    link?: string;
    /**
     * Further channels the same login connected, linked as their own accounts
     * alongside this one (e.g. every number of a WhatsApp Business account).
     */
    additionalAccounts?: IOAuthTokenResult[];
}

export interface IOAuthPlatformService {
    getTokenAndProfile(code: string): Promise<IOAuthTokenResult>;
    /**
     * Refresh or extend credentials for this platform.
     * - Platforms with a standard refresh token (Zalo, TikTok Shop, Shopee): use `refreshToken`
     * - Platforms that extend via the current access token (Instagram, Facebook): use `accessToken`
     */
    refreshCredentials(
        accessToken: string,
        refreshToken?: string
    ): Promise<IOAuthTokenResult>;
    /**
     * Optional best-effort cleanup when an account is unlinked (e.g. Telegram
     * deregisters its webhook). Implementations must swallow their own failures
     * so cleanup never aborts the unlink. `accessToken` is the decrypted token.
     */
    onUnlink?(accessToken: string): Promise<void>;
}
