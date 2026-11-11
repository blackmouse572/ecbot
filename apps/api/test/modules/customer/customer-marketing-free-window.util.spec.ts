import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { customerMarketingFreeWindows } from '../../../src/modules/customer/utils/customer-marketing-free-window.util';

// How long the shop may still message a customer for free on each channel,
// counted from the customer's last message there.

const HOUR = 3_600_000;
const now = new Date('2026-11-11T10:00:00Z');
const ago = (hours: number) => new Date(now.getTime() - hours * HOUR);

describe('customerMarketingFreeWindows', () => {
    it('gives Messenger, Instagram and WhatsApp 24 hours and Zalo OA 48', () => {
        const windows = customerMarketingFreeWindows([
            {
                channel: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                lastInboundAt: ago(18),
            },
            {
                channel: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
                lastInboundAt: ago(30),
            },
            {
                channel: ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
                lastInboundAt: ago(1),
            },
            { channel: ENUM_ACCOUNT_TYPE.ZALO_PAGE, lastInboundAt: ago(30) },
        ]);

        expect(windows).toEqual([
            {
                channel: ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
                lastInboundAt: ago(1),
                openUntil: new Date(ago(1).getTime() + 24 * HOUR),
            },
            {
                channel: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                lastInboundAt: ago(18),
                openUntil: new Date(ago(18).getTime() + 24 * HOUR),
            },
            {
                channel: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
                lastInboundAt: ago(30),
                openUntil: new Date(ago(30).getTime() + 24 * HOUR),
            },
            {
                channel: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                lastInboundAt: ago(30),
                openUntil: new Date(ago(30).getTime() + 48 * HOUR),
            },
        ]);
    });

    it('keeps Telegram open with no end', () => {
        expect(
            customerMarketingFreeWindows([
                {
                    channel: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
                    lastInboundAt: ago(500),
                },
            ])
        ).toEqual([
            {
                channel: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
                lastInboundAt: ago(500),
                openUntil: null,
            },
        ]);
    });

    it('leaves out channels with no free route for offers', () => {
        expect(
            customerMarketingFreeWindows([
                {
                    channel: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                    lastInboundAt: ago(1),
                },
                {
                    channel: ENUM_ACCOUNT_TYPE.API_CHANNEL,
                    lastInboundAt: ago(1),
                },
                {
                    channel: ENUM_ACCOUNT_TYPE.THREADS_ACCOUNT,
                    lastInboundAt: ago(1),
                },
            ])
        ).toEqual([]);
    });
});
