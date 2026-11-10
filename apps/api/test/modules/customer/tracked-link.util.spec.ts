import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { trackedLinkCodeFromName } from '../../../src/modules/customer/utils/tracked-link-code.util';
import { trackedLinkUrl } from '../../../src/modules/customer/utils/tracked-link-url.util';

describe('trackedLinkCodeFromName', () => {
    it('turns a Vietnamese name into a short ascii code', () => {
        expect(trackedLinkCodeFromName('Tờ rơi trong hộp quà Tết')).toBe(
            'to-roi-trong-hop-qua-tet'
        );
    });

    it('maps đ and drops symbols', () => {
        expect(trackedLinkCodeFromName('Đơn #1, Đà Nẵng!')).toBe(
            'don-1-da-nang'
        );
    });

    it('keeps codes at most 40 characters without a trailing dash', () => {
        const code = trackedLinkCodeFromName('a'.repeat(39) + ' bbbb');
        expect(code.length).toBeLessThanOrEqual(40);
        expect(code.endsWith('-')).toBe(false);
    });

    it('falls back to "link" when nothing is left', () => {
        expect(trackedLinkCodeFromName('!!!')).toBe('link');
    });
});

describe('trackedLinkUrl', () => {
    const code = 'to-roi-tet';

    it('builds an m.me ref link for a Facebook Page', () => {
        expect(
            trackedLinkUrl(
                {
                    type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                    externalId: '1234',
                    link: 'https://www.facebook.com/1234',
                },
                code
            )
        ).toBe('https://m.me/1234?ref=to-roi-tet');
    });

    it('builds an ig.me ref link from the Instagram username', () => {
        expect(
            trackedLinkUrl(
                {
                    type: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
                    externalId: '178',
                    link: 'https://www.instagram.com/lumiskincare',
                },
                code
            )
        ).toBe('https://ig.me/m/lumiskincare?ref=to-roi-tet');
    });

    it('builds a t.me start link for a Telegram bot', () => {
        expect(
            trackedLinkUrl(
                {
                    type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
                    externalId: '99',
                    link: 'https://t.me/lumi_bot',
                },
                code
            )
        ).toBe('https://t.me/lumi_bot?start=to-roi-tet');
    });

    it('prefills the code in a WhatsApp message', () => {
        const url = trackedLinkUrl(
            {
                type: ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
                externalId: 'pn',
                link: 'https://wa.me/84901234567',
            },
            code
        );
        expect(url?.startsWith('https://wa.me/84901234567?text=')).toBe(true);
        expect(decodeURIComponent(url!.split('text=')[1])).toContain(
            'to-roi-tet'
        );
    });

    it('adds ecb_src to the shop page for the website widget', () => {
        expect(
            trackedLinkUrl(
                {
                    type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                    externalId: 'w',
                },
                code,
                'https://lumi.vn/kem?color=red'
            )
        ).toBe('https://lumi.vn/kem?color=red&ecb_src=to-roi-tet');
    });

    it('returns null for a website link without a page', () => {
        expect(
            trackedLinkUrl(
                { type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET, externalId: 'w' },
                code
            )
        ).toBeNull();
    });

    it('returns null for channels that cannot carry a code yet', () => {
        expect(
            trackedLinkUrl(
                {
                    type: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                    externalId: 'oa',
                    link: 'https://zalo.me/lumi',
                },
                code
            )
        ).toBeNull();
    });
});
