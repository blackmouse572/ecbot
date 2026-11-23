import { ENUM_ACCOUNT_TYPE as A } from 'src/modules/account/enums/account.enum';
import { ENUM_MARKETING_SKIP_REASON as R } from 'src/modules/marketing/enums/marketing-send.enum';
import { marketingRoute } from 'src/modules/marketing/utils/marketing-route.util';

const now = new Date('2026-11-22T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

// As the adapters declare: Meta 24h, Zalo 48h, Telegram no limit, the
// website widget no offers.
const WINDOW: Partial<Record<A, number | null>> = {
    [A.FACEBOOK_PAGE]: 24,
    [A.INSTAGRAM_PAGE]: 24,
    [A.ZALO_PAGE]: 48,
    [A.TELEGRAM_BOT]: null,
};
const windowHours = (channel: A) => WINDOW[channel];

describe('marketingRoute', () => {
    it('takes the channel the customer wrote on last while it is free', () => {
        expect(
            marketingRoute(
                'c1',
                [
                    {
                        channel: A.ZALO_PAGE,
                        conversationId: 'conv-zalo_page',
                        lastInboundAt: hoursAgo(30),
                    },
                    {
                        channel: A.FACEBOOK_PAGE,
                        conversationId: 'conv-facebook_page',
                        lastInboundAt: hoursAgo(2),
                    },
                ],
                windowHours,
                now
            )
        ).toEqual({
            customerId: 'c1',
            channel: A.FACEBOOK_PAGE,
            conversationId: 'conv-facebook_page',
            openUntil: new Date(hoursAgo(2).getTime() + 24 * 3_600_000),
        });
    });

    it('falls back to an older channel whose window is still open', () => {
        // Messenger closed after 24h; Zalo's 48h still runs.
        expect(
            marketingRoute(
                'c1',
                [
                    {
                        channel: A.FACEBOOK_PAGE,
                        conversationId: 'conv-facebook_page',
                        lastInboundAt: hoursAgo(25),
                    },
                    {
                        channel: A.ZALO_PAGE,
                        conversationId: 'conv-zalo_page',
                        lastInboundAt: hoursAgo(40),
                    },
                ],
                windowHours,
                now
            )
        ).toMatchObject({
            channel: A.ZALO_PAGE,
            conversationId: 'conv-zalo_page',
        });
    });

    it('reaches Telegram any time after the customer wrote', () => {
        expect(
            marketingRoute(
                'c1',
                [
                    {
                        channel: A.TELEGRAM_BOT,
                        conversationId: 'conv-telegram_bot',
                        lastInboundAt: hoursAgo(24 * 90),
                    },
                ],
                windowHours,
                now
            )
        ).toEqual({
            customerId: 'c1',
            channel: A.TELEGRAM_BOT,
            conversationId: 'conv-telegram_bot',
            openUntil: null,
        });
    });

    it('says the window closed, on the latest channel, when none is open', () => {
        expect(
            marketingRoute(
                'c1',
                [
                    {
                        channel: A.INSTAGRAM_PAGE,
                        conversationId: 'conv-instagram_page',
                        lastInboundAt: hoursAgo(30),
                    },
                    {
                        channel: A.ZALO_PAGE,
                        conversationId: 'conv-zalo_page',
                        lastInboundAt: hoursAgo(72),
                    },
                ],
                windowHours,
                now
            )
        ).toEqual({
            customerId: 'c1',
            skip: R.WINDOW_CLOSED,
            channel: A.INSTAGRAM_PAGE,
        });
    });

    it('needs the window open when the offer goes out, not only now', () => {
        // Open for 2 more hours, but the offer waits 3 hours for send hours.
        const sendAt = new Date(now.getTime() + 3 * 3_600_000);
        expect(
            marketingRoute(
                'c1',
                [
                    {
                        channel: A.FACEBOOK_PAGE,
                        conversationId: 'conv-1',
                        lastInboundAt: hoursAgo(22),
                    },
                ],
                windowHours,
                sendAt
            )
        ).toMatchObject({ skip: R.WINDOW_CLOSED });
    });

    it('has no route on channels that never carry offers', () => {
        expect(
            marketingRoute(
                'c1',
                [
                    {
                        channel: A.WEBSITE_WIDGET,
                        conversationId: 'conv-website_widget',
                        lastInboundAt: hoursAgo(1),
                    },
                ],
                windowHours,
                now
            )
        ).toEqual({ customerId: 'c1', skip: R.NO_CHANNEL });
        expect(marketingRoute('c2', [], windowHours, now)).toEqual({
            customerId: 'c2',
            skip: R.NO_CHANNEL,
        });
    });
});
