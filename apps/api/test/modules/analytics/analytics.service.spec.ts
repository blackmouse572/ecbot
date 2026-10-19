import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_ANALYTICS_RANGE } from '../../../src/modules/analytics/constants/analytics.constant';
import { AnalyticsService } from '../../../src/modules/analytics/services/analytics.service';
import { analyticsWindows } from '../../../src/modules/analytics/utils/analytics-window.util';
import { ENUM_CUSTOMER_TAG_SYSTEM_KEY } from '../../../src/modules/customer/enums/customer-tag.enum';

// 2026-10-18 20:00 UTC is already 2026-10-19 in Vietnam.
const NOW = new Date('2026-10-18T20:00:00Z');
const TZ = 'Asia/Ho_Chi_Minh';

describe('analyticsWindows', () => {
    it('ends today in the timezone and compares with the same length before', () => {
        const w = analyticsWindows(ENUM_ANALYTICS_RANGE.DAYS_7, TZ, NOW);

        expect(w.current).toEqual({ from: '2026-10-13', to: '2026-10-20' });
        expect(w.previous).toEqual({ from: '2026-10-06', to: '2026-10-13' });
        expect(w.days).toEqual([
            '2026-10-13',
            '2026-10-14',
            '2026-10-15',
            '2026-10-16',
            '2026-10-17',
            '2026-10-18',
            '2026-10-19',
        ]);
    });

    it('uses the UTC date in UTC', () => {
        const w = analyticsWindows(ENUM_ANALYTICS_RANGE.DAYS_7, 'UTC', NOW);
        expect(w.current.to).toBe('2026-10-19');
    });
});

describe('AnalyticsService', () => {
    const repo = {
        conversionByChannel: jest.fn(),
        conversionDaily: jest.fn(),
        medianHoursToOrder: jest.fn(),
        sentimentDaily: jest.fn(),
        sentimentByChannel: jest.fn(),
        unhappyCustomers: jest.fn(),
        botDaily: jest.fn(),
        botByChatbot: jest.fn(),
        handoffReasons: jest.fn(),
        customerTags: jest.fn(),
        customerTotals: jest.fn(),
        customersByChannel: jest.fn(),
        customersDaily: jest.fn(),
    };
    const cache = { get: jest.fn(), set: jest.fn() };
    const service = new AnalyticsService(repo as any, cache as any);
    const args = ['ws-1', ENUM_ANALYTICS_RANGE.DAYS_7, TZ, NOW] as const;

    beforeEach(() => {
        jest.resetAllMocks();
        cache.get.mockResolvedValue(undefined);
    });

    it('returns a cached section without querying', async () => {
        cache.get.mockResolvedValue({ generatedAt: 'cached' });

        const result = await service.getConversion(...args);

        expect(result).toEqual({ generatedAt: 'cached' });
        expect(repo.conversionByChannel).not.toHaveBeenCalled();
        expect(cache.get).toHaveBeenCalledWith(
            'analytics:ws-1:conversion:7d:Asia/Ho_Chi_Minh'
        );
    });

    it('computes conversion against the previous period and fills empty days', async () => {
        repo.conversionByChannel
            .mockResolvedValueOnce([
                {
                    platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                    newCustomers: 40,
                    engaged: 30,
                    hotLeads: 12,
                    orders: 8,
                },
                {
                    platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                    newCustomers: 10,
                    engaged: 6,
                    hotLeads: 3,
                    orders: 2,
                },
            ])
            .mockResolvedValueOnce([
                {
                    platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                    newCustomers: 0,
                    engaged: 0,
                    hotLeads: 0,
                    orders: 0,
                },
            ]);
        repo.conversionDaily.mockResolvedValue([
            { day: '2026-10-15', newCustomers: 5, orders: 1 },
        ]);
        repo.medianHoursToOrder.mockResolvedValue(5.46);

        const result = await service.getConversion(...args);

        expect(result.conversionRate).toEqual({ current: 20, previous: 0 });
        expect(result.byChannel[0].platform).toBe(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE
        );
        expect(result.daily).toHaveLength(7);
        expect(result.daily[2]).toEqual({
            day: '2026-10-15',
            newCustomers: 5,
            orders: 1,
        });
        expect(result.daily[0]).toEqual({
            day: '2026-10-13',
            newCustomers: 0,
            orders: 0,
        });
        expect(result.medianHoursToOrder).toBe(5.5);
        expect(repo.conversionByChannel.mock.calls[0][0]).toEqual({
            workspaceId: 'ws-1',
            from: '2026-10-13',
            to: '2026-10-20',
            timezone: TZ,
        });
        expect(repo.conversionByChannel.mock.calls[1][0].from).toBe(
            '2026-10-06'
        );
        expect(cache.set).toHaveBeenCalledWith(
            'analytics:ws-1:conversion:7d:Asia/Ho_Chi_Minh',
            result,
            10 * 60 * 1000
        );
    });

    it('rates positive conversations over every classified one', async () => {
        repo.sentimentDaily
            .mockResolvedValueOnce([
                { day: '2026-10-14', positive: 6, negative: 2, complaint: 2 },
            ])
            .mockResolvedValueOnce([]);
        repo.sentimentByChannel.mockResolvedValue([
            {
                platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                conversations: 8,
                positive: 6,
                negative: 1,
            },
        ]);
        repo.unhappyCustomers.mockResolvedValue([
            {
                customerId: 'c1',
                conversationId: null,
                name: null,
                platform: null,
                tagName: 'Khiếu nại',
                emoji: null,
                at: new Date('2026-10-18T10:00:00Z'),
            },
        ]);

        const result = await service.getMarketing(...args);

        expect(result.positiveRate).toEqual({ current: 60, previous: 0 });
        expect(result.byChannel).toEqual([
            {
                platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                conversations: 8,
                positive: 75,
                negative: 12.5,
            },
        ]);
        expect(result.unhappy).toEqual([
            {
                customerId: 'c1',
                conversationId: undefined,
                name: undefined,
                platform: undefined,
                tagName: 'Khiếu nại',
                emoji: undefined,
                at: '2026-10-18T10:00:00.000Z',
            },
        ]);
    });

    it('turns bot counts into rates and labels handoff reasons', async () => {
        repo.botDaily
            .mockResolvedValueOnce([
                {
                    day: '2026-10-14',
                    conversations: 8,
                    botResolved: 6,
                    handedOver: 2,
                },
            ])
            .mockResolvedValueOnce([
                {
                    day: '2026-10-07',
                    conversations: 4,
                    botResolved: 2,
                    handedOver: 2,
                },
            ]);
        repo.botByChatbot.mockResolvedValue([
            {
                id: 'b1',
                name: 'Shop bot',
                conversations: 8,
                botResolved: 6,
                handedOver: 2,
                firstReplySeconds: 6.4,
                toolCalls: 40,
                toolErrors: 1,
            },
        ]);
        repo.handoffReasons.mockResolvedValue([
            {
                reason: 'tag_trigger',
                tagId: 't1',
                tagName: 'Cần nhân viên',
                emoji: '🙋',
                systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEEDS_STAFF,
                count: 3,
            },
            {
                reason: 'fallback_threshold',
                tagId: null,
                tagName: null,
                emoji: null,
                systemKey: null,
                count: 2,
            },
            {
                reason: 'guardrail_x',
                tagId: null,
                tagName: null,
                emoji: null,
                systemKey: null,
                count: 1,
            },
            {
                reason: 'something_else',
                tagId: null,
                tagName: null,
                emoji: null,
                systemKey: null,
                count: 1,
            },
        ]);

        const result = await service.getBot(...args);

        expect(result.handoffRate).toEqual({ current: 25, previous: 50 });
        expect(result.daily[1]).toEqual({
            day: '2026-10-14',
            botResolved: 6,
            handedOver: 2,
        });
        expect(result.byChatbot).toEqual([
            {
                id: 'b1',
                name: 'Shop bot',
                conversations: 8,
                botResolvedRate: 75,
                handoffRate: 25,
                firstReplySeconds: 6,
                toolErrorRate: 2.5,
            },
        ]);
        expect(result.reasons).toEqual([
            { key: 't1', tagName: 'Cần nhân viên', emoji: '🙋', count: 3 },
            { key: 'fallback_threshold', count: 2 },
            { key: 'other', count: 2 },
        ]);
    });

    it('counts customers by tag, untagged and channel', async () => {
        repo.customerTags.mockResolvedValue([
            { id: 't1', name: 'VIP', emoji: null, count: 4 },
        ]);
        repo.customerTotals.mockResolvedValue({ total: 10, untagged: 6 });
        repo.customersByChannel.mockResolvedValue([
            { platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE, count: 10 },
        ]);
        repo.customersDaily.mockResolvedValue([]);

        const result = await service.getCustomers(...args);

        expect(result.tags).toEqual([
            { id: 't1', name: 'VIP', emoji: undefined, count: 4 },
        ]);
        expect(result.total).toBe(10);
        expect(result.untagged).toBe(6);
        expect(result.daily).toHaveLength(7);
        expect(result.byChannel).toEqual([
            { platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE, count: 10 },
        ]);
    });
});
