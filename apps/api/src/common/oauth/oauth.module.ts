import { InstagramOAuthService } from '@app/common/instagram/services/instagram-oauth.service';
import { OAuthPlatformFactory } from '@app/common/oauth/oauth-platform.factory';
import { FacebookOAuthAdapterService } from '@app/common/oauth/services/facebook-oauth-adapter.service';
import { ShopeeOAuthService } from '@app/common/shopee/services/shopee-oauth.service';
import { TelegramOAuthService } from '@app/common/telegram/services/telegram-oauth.service';
import { TikTokShopOAuthService } from '@app/common/tiktok-shop/services/tiktok-shop-oauth.service';
import { WhatsAppOAuthService } from '@app/common/whatsapp/services/whatsapp-oauth.service';
import { ZaloOAuthService } from '@app/common/zalo/services/zalo-oauth.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [HttpModule.register({ timeout: 1000 * 10 }), ConfigModule],
    providers: [
        FacebookOAuthAdapterService,
        InstagramOAuthService,
        ZaloOAuthService,
        TikTokShopOAuthService,
        ShopeeOAuthService,
        TelegramOAuthService,
        WhatsAppOAuthService,
        OAuthPlatformFactory,
    ],
    exports: [OAuthPlatformFactory],
})
export class OAuthModule {}
