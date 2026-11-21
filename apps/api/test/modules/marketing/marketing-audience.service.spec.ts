import { BadRequestException } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { ENUM_CUSTOMER_JOURNEY_STAGE as S } from 'src/modules/customer/enums/customer-marketing.enum';
import {
    ENUM_MARKETING_AUDIENCE_EXCLUSION as X,
    ENUM_MARKETING_AUDIENCE_FIELD as F,
    ENUM_MARKETING_AUDIENCE_MATCH as M,
    ENUM_MARKETING_AUDIENCE_OPERATOR as O,
} from 'src/modules/marketing/enums/marketing-audience.enum';
import { ENUM_MARKETING_TODO as T } from 'src/modules/marketing/enums/marketing-overview.enum';
import { MarketingAudienceService } from 'src/modules/marketing/services/marketing-audience.service';

const GROUP = '0193a5d2-7c1e-7b3a-9f1e-2b8c4d6e8f10';

describe('MarketingAudienceService', () => {
    const now = new Date('2026-11-20T00:00:00.000Z');
    const repository = { preview: jest.fn(), reached: jest.fn() };
    const service = new MarketingAudienceService(repository as any);

    beforeEach(() => {
        jest.resetAllMocks();
        repository.preview.mockResolvedValue({
            reasons: [
                { reason: null, count: 48 },
                { reason: X.PAUSED, count: 2 },
                { reason: X.STOPPED, count: 4 },
            ],
            channels: [
                { platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, count: 40 },
            ],
        });
        repository.reached.mockResolvedValue({ ids: ['c1', 'c2'], total: 48 });
    });

    it('counts who it reaches and every exclusion reason, in order', async () => {
        const preview = await service.preview('ws1', { preset: T.NEW }, now);

        expect(repository.preview).toHaveBeenCalledWith(
            'ws1',
            { preset: T.NEW },
            now
        );
        expect(preview).toEqual({
            count: 48,
            excluded: {
                total: 6,
                reasons: [
                    { reason: X.STOPPED, count: 4 },
                    { reason: X.HOSTILE, count: 0 },
                    { reason: X.PAUSED, count: 2 },
                    { reason: X.DEFERRED, count: 0 },
                ],
            },
            channels: [
                { platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, count: 40 },
            ],
        });
    });

    it('matches all conditions unless told otherwise', async () => {
        const condition = { field: F.STAGE, operator: O.IN, values: [S.NEW] };
        await service.preview('ws1', { conditions: [condition] }, now);

        expect(repository.preview).toHaveBeenCalledWith(
            'ws1',
            { match: M.ALL, conditions: [condition] },
            now
        );
    });

    it('pages the reached customers with their total', async () => {
        await expect(
            service.reached('ws1', { preset: T.NEW }, 20, 40, now)
        ).resolves.toEqual({ ids: ['c1', 'c2'], total: 48 });
        expect(repository.reached).toHaveBeenCalledWith(
            'ws1',
            { preset: T.NEW },
            now,
            20,
            40
        );
    });

    it.each([
        ['neither a preset nor conditions', {}],
        [
            'both a preset and conditions',
            {
                preset: T.NEW,
                conditions: [
                    { field: F.STAGE, operator: O.IN, values: [S.NEW] },
                ],
            },
        ],
        ['no conditions', { conditions: [] }],
        [
            'an operator the field does not take',
            {
                conditions: [
                    { field: F.STAGE, operator: O.AT_LEAST, number: 1 },
                ],
            },
        ],
        [
            'a list operator without values',
            { conditions: [{ field: F.CHANNEL, operator: O.IN, values: [] }] },
        ],
        [
            'a stage that does not exist',
            {
                conditions: [
                    { field: F.STAGE, operator: O.IN, values: ['VIP'] },
                ],
            },
        ],
        [
            'a channel that does not exist',
            {
                conditions: [
                    { field: F.CHANNEL, operator: O.IN, values: ['FAX'] },
                ],
            },
        ],
        [
            'a product group that is not an id',
            {
                conditions: [
                    {
                        field: F.PRODUCT_GROUP_BOUGHT,
                        operator: O.IN,
                        values: ['x'],
                    },
                ],
            },
        ],
        [
            'days without a number',
            {
                conditions: [
                    { field: F.LAST_MESSAGE, operator: O.WITHIN_DAYS },
                ],
            },
        ],
        [
            'zero days',
            {
                conditions: [
                    {
                        field: F.LAST_MESSAGE,
                        operator: O.WITHIN_DAYS,
                        number: 0,
                    },
                ],
            },
        ],
    ])('rejects %s', async (_case, dto) => {
        await expect(
            service.preview('ws1', dto as any, now)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.preview).not.toHaveBeenCalled();
    });

    it('accepts each field with an operator it takes', async () => {
        await service.preview(
            'ws1',
            {
                match: M.ANY,
                conditions: [
                    {
                        field: F.PRODUCT_GROUP_ASKED,
                        operator: O.IN,
                        values: [GROUP],
                    },
                    { field: F.ORDERED_AFTER_PRICE, operator: O.NO },
                    { field: F.ORDER_COUNT, operator: O.AT_MOST, number: 0 },
                    {
                        field: F.TOTAL_SPEND,
                        operator: O.AT_LEAST,
                        number: 500_000,
                    },
                    { field: F.LABEL, operator: O.NOT_IN, values: [GROUP] },
                    {
                        field: F.CHANNEL,
                        operator: O.IN,
                        values: [ENUM_ACCOUNT_TYPE.ZALO_PAGE],
                    },
                ],
            },
            now
        );
        expect(repository.preview).toHaveBeenCalled();
    });
});
