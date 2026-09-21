import { registerAs } from '@nestjs/config';

export default registerAs(
    'facebook',
    (): Record<string, any> => ({
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
        webhookSecret: process.env.FACEBOOK_WEBHOOK_SECRET,
        graphApiVersion: process.env.FACEBOOK_GRAPH_API_VERSION || 'v16.0',
        redirectUri: process.env.FACEBOOK_REDIRECT_URI,
        apiCallbackUrl: process.env.FACEBOOK_CALLBACK_URL,
        pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    })
);
