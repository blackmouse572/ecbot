import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthPlatformFactory } from '../../../src/common/oauth/oauth-platform.factory';
import { FacebookOAuthAdapterService } from '../../../src/common/oauth/services/facebook-oauth-adapter.service';
import { InstagramOAuthService } from '../../../src/common/instagram/services/instagram-oauth.service';
import { ZaloOAuthService } from '../../../src/common/zalo/services/zalo-oauth.service';
import { TikTokShopOAuthService } from '../../../src/common/tiktok-shop/services/tiktok-shop-oauth.service';
import { ShopeeOAuthService } from '../../../src/common/shopee/services/shopee-oauth.service';
import { TelegramOAuthService } from '../../../src/common/telegram/services/telegram-oauth.service';
import { WhatsAppOAuthService } from '../../../src/common/whatsapp/services/whatsapp-oauth.service';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';

const mockFacebookAdapter = {
    getTokenAndProfile: jest.fn(),
    refreshToken: jest.fn(),
};
const mockInstagramService = {
    getTokenAndProfile: jest.fn(),
    refreshToken: jest.fn(),
};
const mockZaloService = {
    getTokenAndProfile: jest.fn(),
    refreshToken: jest.fn(),
};
const mockTiktokService = {
    getTokenAndProfile: jest.fn(),
    refreshToken: jest.fn(),
};
const mockShopeeService = {
    getTokenAndProfile: jest.fn(),
    refreshToken: jest.fn(),
};
const mockTelegramService = {
    getTokenAndProfile: jest.fn(),
    refreshCredentials: jest.fn(),
};

const mockWhatsAppService = {
    getTokenAndProfile: jest.fn(),
    refreshCredentials: jest.fn(),
};

describe('OAuthPlatformFactory', () => {
    let factory: OAuthPlatformFactory;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OAuthPlatformFactory,
                {
                    provide: FacebookOAuthAdapterService,
                    useValue: mockFacebookAdapter,
                },
                {
                    provide: InstagramOAuthService,
                    useValue: mockInstagramService,
                },
                { provide: ZaloOAuthService, useValue: mockZaloService },
                {
                    provide: TikTokShopOAuthService,
                    useValue: mockTiktokService,
                },
                { provide: ShopeeOAuthService, useValue: mockShopeeService },
                {
                    provide: TelegramOAuthService,
                    useValue: mockTelegramService,
                },
                {
                    provide: WhatsAppOAuthService,
                    useValue: mockWhatsAppService,
                },
            ],
        }).compile();

        factory = module.get<OAuthPlatformFactory>(OAuthPlatformFactory);
    });

    it('returns the Facebook adapter for FACEBOOK_ACCOUNT', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT)).toBe(
            mockFacebookAdapter
        );
    });

    it('returns the Instagram service for INSTAGRAM_ACCOUNT', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT)).toBe(
            mockInstagramService
        );
    });

    it('returns the Zalo service for ZALO_ACCOUNT', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT)).toBe(
            mockZaloService
        );
    });

    it('returns the TikTok Shop service for TIKTOK_SHOP', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.TIKTOK_SHOP)).toBe(
            mockTiktokService
        );
    });

    it('returns the Shopee service for SHOPEE_SHOP', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.SHOPEE_SHOP)).toBe(
            mockShopeeService
        );
    });

    it('returns the Telegram service for TELEGRAM_BOT', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.TELEGRAM_BOT)).toBe(
            mockTelegramService
        );
    });

    it('returns the WhatsApp service for WHATSAPP_BUSINESS', () => {
        expect(factory.getService(ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS)).toBe(
            mockWhatsAppService
        );
    });

    it('throws BadRequestException for an unsupported platform', () => {
        expect(() =>
            factory.getService(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE)
        ).toThrow(BadRequestException);
    });
});
