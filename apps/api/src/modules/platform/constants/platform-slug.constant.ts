import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';

export const PLATFORM_SLUG_TO_TYPE: Record<string, ENUM_ACCOUNT_TYPE> = {
    messenger: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    facebook: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    zalo: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
    instagram: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
    tiktok: ENUM_ACCOUNT_TYPE.TIKTOK_SHOP,
    shopee: ENUM_ACCOUNT_TYPE.SHOPEE_SHOP,
    telegram: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
    whatsapp: ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
    // Registered so the channel is addressable, but neither eccho-issued channel
    // is reachable through the unauthenticated `POST /public/webhooks/:platform`
    // route: both adapters return false from verifySignature, so that route
    // always 403s. Their real ingress is /client (API channel, ClientCredential)
    // and /public/widget (website widget, widget key + Turnstile).
    api: ENUM_ACCOUNT_TYPE.API_CHANNEL,
    website: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
};
