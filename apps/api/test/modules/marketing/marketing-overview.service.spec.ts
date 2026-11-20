import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { ENUM_CUSTOMER_JOURNEY_STAGE as S } from 'src/modules/customer/enums/customer-marketing.enum';
import { ENUM_MARKETING_TODO as T } from 'src/modules/marketing/enums/marketing-overview.enum';
import { MarketingOverviewService } from 'src/modules/marketing/services/marketing-overview.service';

const todo = (count: number, excluded = 0) => ({ count, excluded });

describe('MarketingOverviewService', () => {
    const now = new Date('2026-11-20T00:00:00.000Z');
    const repository = {
        stageCounts: jest.fn(),
        moves: jest.fn(),
        funnel: jest.fn(),
        now: jest.fn(),
        optOuts: jest.fn(),
    };
    const service = new MarketingOverviewService(repository as any);

    beforeEach(() => {
        jest.resetAllMocks();
        repository.stageCounts.mockResolvedValue([
            { stage: S.ASKED_PRICE, current: 4, previous: 6 },
            { stage: S.NEW, current: 10, previous: 8 },
        ]);
        repository.moves.mockResolvedValue([
            { from: S.ASKED_PRICE, to: S.BOUGHT_ONCE, count: 3 },
        ]);
        repository.funnel.mockResolvedValue([
            { platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE, stage: S.NEW, count: 2 },
            {
                platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                stage: S.NEW,
                count: 5,
            },
            {
                platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                stage: S.ASKED_PRICE,
                count: 3,
            },
            {
                platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                stage: S.BOUGHT_REPEAT,
                count: 1,
            },
        ]);
        repository.now.mockResolvedValue({
            total: 14,
            dormant: 2,
            paused: 1,
            todos: {
                [T.NEW]: todo(3),
                [T.INTERESTED]: todo(0),
                [T.ASKED_PRICE]: todo(2, 1),
                [T.CROSS_SELL]: todo(0),
                [T.REPURCHASE]: todo(1),
                [T.WIN_BACK]: todo(0),
            },
            todoTotal: todo(6, 1),
        });
        repository.optOuts.mockResolvedValue({ current: 2, previous: 1 });
    });

    it('measures everything against the same workspace and instant', async () => {
        await service.get('ws1', now);

        for (const query of Object.values(repository)) {
            expect(query).toHaveBeenCalledWith({ workspaceId: 'ws1', now });
        }
    });

    it('lists every stage in order, with zero for stages nobody is at', async () => {
        const overview = await service.get('ws1', now);

        expect(overview.stages).toEqual([
            { stage: S.NEW, current: 10, previous: 8 },
            { stage: S.INTERESTED, current: 0, previous: 0 },
            { stage: S.ASKED_PRICE, current: 4, previous: 6 },
            { stage: S.BOUGHT_ONCE, current: 0, previous: 0 },
            { stage: S.BOUGHT_REPEAT, current: 0, previous: 0 },
        ]);
        expect(overview.since).toEqual(new Date('2026-11-13T00:00:00.000Z'));
    });

    it('counts each funnel step as the customers who reached it or a later one', async () => {
        const overview = await service.get('ws1', now);

        expect(overview.funnel).toEqual([
            {
                platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                stages: [
                    { stage: S.NEW, count: 9 },
                    { stage: S.INTERESTED, count: 4 },
                    { stage: S.ASKED_PRICE, count: 4 },
                    { stage: S.BOUGHT_ONCE, count: 1 },
                    { stage: S.BOUGHT_REPEAT, count: 1 },
                ],
            },
            {
                platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                stages: [
                    { stage: S.NEW, count: 2 },
                    { stage: S.INTERESTED, count: 0 },
                    { stage: S.ASKED_PRICE, count: 0 },
                    { stage: S.BOUGHT_ONCE, count: 0 },
                    { stage: S.BOUGHT_REPEAT, count: 0 },
                ],
            },
        ]);
    });

    it('returns the Việc nên làm rows in stage order, with totals and health', async () => {
        const overview = await service.get('ws1', now);

        expect(overview.todos.map(row => row.key)).toEqual([
            T.NEW,
            T.INTERESTED,
            T.ASKED_PRICE,
            T.CROSS_SELL,
            T.REPURCHASE,
            T.WIN_BACK,
        ]);
        expect(overview.todos[2]).toEqual({
            key: T.ASKED_PRICE,
            count: 2,
            excluded: 1,
        });
        expect(overview.todoTotal).toEqual(todo(6, 1));
        expect(overview).toMatchObject({
            total: 14,
            dormant: 2,
            moves: [{ from: S.ASKED_PRICE, to: S.BOUGHT_ONCE, count: 3 }],
            health: { optOuts: 2, optOutsPrevious: 1, paused: 1 },
        });
    });
});
