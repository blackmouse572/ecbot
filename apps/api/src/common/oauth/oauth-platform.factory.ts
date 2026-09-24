import { InstagramOAuthService } from '@app/common/instagram/services/instagram-oauth.service';
import { IOAuthPlatformService } from '@app/common/oauth/interfaces/oauth-platform.interface';
import { FacebookOAuthAdapterService } from '@app/common/oauth/services/facebook-oauth-adapter.service';
import { ShopeeOAuthService } from '@app/common/shopee/services/shopee-oauth.service';
import { TelegramOAuthService } from '@app/common/telegram/services/telegram-oauth.service';
import { TikTokShopOAuthService } from '@app/common/tiktok-shop/services/tiktok-shop-oauth.service';
import { WhatsAppOAuthService } from '@app/common/whatsapp/services/whatsapp-oauth.service';
import { ZaloOAuthService } from '@app/common/zalo/services/zalo-oauth.service';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class OAuthPlatformFactory {
    constructor(
        private readonly facebookAdapter: FacebookOAuthAdapterService,
        private readonly instagramService: InstagramOAuthService,
        private readonly zaloService: ZaloOAuthService,
        private readonly tiktokShopService: TikTokShopOAuthService,
        private readonly shopeeService: ShopeeOAuthService,
        private readonly telegramService: TelegramOAuthService,
        private readonly whatsAppService: WhatsAppOAuthService
    ) {}

    getService(platform: ENUM_ACCOUNT_TYPE): IOAuthPlatformService {
        switch (platform) {
            case ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT:
                return this.facebookAdapter;
            case ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT:
                return this.instagramService;
            case ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT:
                return this.zaloService;
            case ENUM_ACCOUNT_TYPE.TIKTOK_SHOP:
                return this.tiktokShopService;
            case ENUM_ACCOUNT_TYPE.SHOPEE_SHOP:
                return this.shopeeService;
            case ENUM_ACCOUNT_TYPE.TELEGRAM_BOT:
                return this.telegramService;
            case ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS:
                return this.whatsAppService;
            default:
                throw new BadRequestException(
                    `Unsupported OAuth platform: ${platform}`
                );
        }
    }
}
