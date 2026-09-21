export enum ENUM_ACCOUNT_STATUS {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    BLOCKED = 'BLOCKED',
}

/**
 * Channel kind. The value is persisted and travels to the frontend, so it is
 * part of the wire contract — add, never rename.
 */
export enum ENUM_ACCOUNT_TYPE {
    FACEBOOK_ACCOUNT = 'FACEBOOK_ACCOUNT',
    INSTAGRAM_ACCOUNT = 'INSTAGRAM_ACCOUNT',
    FACEBOOK_PAGE = 'FACEBOOK_PAGE',
    INSTAGRAM_PAGE = 'INSTAGRAM_PAGE',
    ZALO_ACCOUNT = 'ZALO_ACCOUNT',
    ZALO_PAGE = 'ZALO_PAGE',
    TIKTOK_SHOP = 'TIKTOK_SHOP',
    SHOPEE_SHOP = 'SHOPEE_SHOP',
    TELEGRAM_BOT = 'TELEGRAM_BOT',
    API_CHANNEL = 'API_CHANNEL',
    WEBSITE_WIDGET = 'WEBSITE_WIDGET',
}
