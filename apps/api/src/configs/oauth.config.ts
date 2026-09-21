import { registerAs } from '@nestjs/config';

export default registerAs(
    'oauth',
    (): Record<string, any> => ({
        tokenEncryptKey: process.env.OAUTH_TOKEN_ENCRYPT_KEY,
        tokenEncryptIv: process.env.OAUTH_TOKEN_ENCRYPT_IV,
        tokenEncryptDefaultKeyId:
            process.env.OAUTH_TOKEN_ENCRYPT_DEFAULT_KEY_ID || 'v1',
        tokenEncryptKeys: {
            v1: process.env.OAUTH_TOKEN_ENCRYPT_KEY,
        },
        instagram: {
            appId: process.env.INSTAGRAM_APP_ID,
            appSecret: process.env.INSTAGRAM_APP_SECRET,
            redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
        },
        zalo: {
            appId: process.env.ZALO_APP_ID,
            appSecret: process.env.ZALO_APP_SECRET,
            redirectUri: process.env.ZALO_REDIRECT_URI,
        },
        tiktokShop: {
            appKey: process.env.TIKTOK_APP_KEY,
            appSecret: process.env.TIKTOK_APP_SECRET,
            redirectUri: process.env.TIKTOK_REDIRECT_URI,
        },
        shopee: {
            partnerId: process.env.SHOPEE_PARTNER_ID,
            partnerKey: process.env.SHOPEE_PARTNER_KEY,
            redirectUri: process.env.SHOPEE_REDIRECT_URI,
        },
    })
);
