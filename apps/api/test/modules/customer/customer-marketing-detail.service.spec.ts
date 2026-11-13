import { NotFoundException } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE as STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION as PERMISSION,
    ENUM_MARKETING_EVENT_ACTOR as ACTOR,
    ENUM_MARKETING_EVENT_KIND as KIND,
} from '../../../src/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingStateEntity } from '../../../src/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerMarketingService } from '../../../src/modules/customer/services/customer-marketing.service';
import { ConversationRepository } from '../../../src/modules/conversation/repository/repositories/conversation.repository';
import { PlatformAdapterRegistry } from '../../../src/modules/platform/services/platform-adapter.registry';
import { ENUM_TRACKED_LINK_KIND } from '../../../src/modules/customer/enums/tracked-link.enum';
import { customerMarketingFreeWindows } from '../../../src/modules/customer/utils/customer-marketing-free-window.util';

// What the app reads about a Customer's marketing labels: the "why" behind
// each layer, the free-message window per channel, the summary on list rows,
// and an operator's edit applied in a safe order.

const HOUR = 3_600_000;

function state(patch: Partial<CustomerMarketingStateEntity> = {}) {
    const s = new CustomerMarketingStateEntity();
    s.customer = { id: 'c1' } as any;
    s.workspace = { id: 'w1' } as any;
    Object.assign(s, patch);
    return s;
}

function makeHarness(opts: {
    state?: CustomerMarketingStateEntity | null;
    events?: Record<string, any>;
    lastInbound?: { channel: ENUM_ACCOUNT_TYPE; lastInboundAt: Date }[];
    states?: CustomerMarketingStateEntity[];
    reactions?: any[];
}) {
    const em: any = {
        getReference: jest.fn((_e: any, id: string) => ({ id })),
        persist: jest.fn(() => em),
        flush: jest.fn().mockResolvedValue(undefined),
        fork: jest.fn(() => em),
    };
    const stateRepository = {
        findByCustomer: jest.fn(async () => opts.state ?? null),
        find: jest.fn(async () => opts.states ?? []),
        customerListFilter: jest.fn(() => ({ marker: true })),
        populateFirstSource: jest.fn(async () => undefined),
    };
    const eventRepository = {
        findOne: jest.fn(
            async (where: any) => opts.events?.[where.kind] ?? null
        ),
    };
    const customerRepository = {
        findOne: jest.fn(async (where: any) =>
            where.id === 'c1' && where.workspace === 'w1' ? { id: 'c1' } : null
        ),
    };
    const conversationRepository = {
        lastInboundByChannel: jest.fn(async () => opts.lastInbound ?? []),
    };
    // Only Messenger has a free window in these tests.
    const platformRegistry = {
        has: (type: ENUM_ACCOUNT_TYPE) =>
            type === ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        get: () => ({ capabilities: { freeMessageWindowHours: 24 } }),
    };

    const reactionRepository = {
        findActiveByCustomer: jest.fn(async () => opts.reactions ?? []),
    };

    const moduleRef = {
        get: jest.fn((token: any) =>
            token === ConversationRepository
                ? conversationRepository
                : token === PlatformAdapterRegistry
                  ? platformRegistry
                  : null
        ),
    };
    const service = new CustomerMarketingService(
        em,
        stateRepository as any,
        eventRepository as any,
        customerRepository as any,
        reactionRepository as any,
        moduleRef as any
    );
    return {
        service,
        stateRepository,
        eventRepository,
        conversationRepository,
        reactionRepository,
    };
}

const KOL_CODE = {
    id: 'k1',
    name: 'KOL Minh Thư',
    kind: ENUM_TRACKED_LINK_KIND.KOL,
    parent: { id: 's1', name: 'Tờ rơi Tết' },
    account: { type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE },
} as any;

describe('CustomerMarketingService.getDetail', () => {
    it('returns the latest event behind stage and permission', async () => {
        const stageEvent = {
            id: 'e1',
            kind: KIND.STAGE,
            actor: ACTOR.CLASSIFIER,
            oldValue: STAGE.INTERESTED,
            newValue: STAGE.ASKED_PRICE,
            reason: 'Khách hỏi giá serum vitamin C',
            conversationId: 'conv-1',
            messageId: 'm-1',
            createdAt: new Date('2026-11-10T12:50:00Z'),
        };
        const permissionEvent = {
            id: 'e2',
            kind: KIND.PERMISSION,
            actor: ACTOR.RULE,
            oldValue: PERMISSION.GRANTED,
            newValue: PERMISSION.STOPPED,
            reason: 'opt_out_keyword',
            createdAt: new Date('2026-11-10T13:00:00Z'),
        };
        const { service, eventRepository } = makeHarness({
            state: state({
                stage: STAGE.ASKED_PRICE,
                permission: PERMISSION.STOPPED,
            }),
            events: {
                [KIND.STAGE]: stageEvent,
                [KIND.PERMISSION]: permissionEvent,
            },
        });

        const detail = await service.getDetail('c1', 'w1');

        expect(detail.stage).toBe(STAGE.ASKED_PRICE);
        expect(detail.stageEvent).toEqual(
            expect.objectContaining({
                id: 'e1',
                actor: ACTOR.CLASSIFIER,
                reason: 'Khách hỏi giá serum vitamin C',
                conversationId: 'conv-1',
                messageId: 'm-1',
            })
        );
        expect(detail.permissionEvent).toEqual(
            expect.objectContaining({ id: 'e2', reason: 'opt_out_keyword' })
        );
        // The newest event that set the label to what it is now.
        expect(eventRepository.findOne).toHaveBeenCalledWith(
            {
                customer: 'c1',
                workspace: 'w1',
                kind: KIND.STAGE,
                newValue: STAGE.ASKED_PRICE,
            },
            { order: { createdAt: 'DESC' } }
        );
    });

    it('picks the event that set the current value when one request wrote two', async () => {
        // PATCH { hostile: true, permission: GRANTED } writes STOPPED then
        // GRANTED in the same millisecond, so the sort alone cannot tell them apart.
        const at = new Date('2026-11-10T13:00:00Z');
        const rows = [
            {
                id: 'e9',
                kind: KIND.PERMISSION,
                newValue: PERMISSION.STOPPED,
                reason: 'hostile',
                createdAt: at,
            },
            {
                id: 'e1',
                kind: KIND.PERMISSION,
                newValue: PERMISSION.GRANTED,
                reason: 'Khách đồng ý qua điện thoại',
                createdAt: at,
            },
            {
                id: 'e8',
                kind: KIND.STAGE,
                newValue: STAGE.NEW,
                reason: 'first_message',
                createdAt: at,
            },
            {
                id: 'e2',
                kind: KIND.STAGE,
                newValue: STAGE.INTERESTED,
                reason: 'Hỏi về serum',
                createdAt: at,
            },
        ];
        const { service, eventRepository } = makeHarness({
            state: state({
                stage: STAGE.INTERESTED,
                permission: PERMISSION.GRANTED,
            }),
        });
        eventRepository.findOne.mockImplementation(
            async (where: any) =>
                rows.find(
                    r =>
                        r.kind === where.kind &&
                        (where.newValue === undefined ||
                            r.newValue === where.newValue)
                ) ?? null
        );

        const detail = await service.getDetail('c1', 'w1');

        expect(detail.permissionEvent).toEqual(
            expect.objectContaining({ id: 'e1' })
        );
        expect(detail.stageEvent).toEqual(
            expect.objectContaining({ id: 'e2' })
        );
    });

    it('falls back to the newest event of the kind when none set the current value', async () => {
        const fallback = { id: 'e5', kind: KIND.STAGE, newValue: STAGE.NEW };
        const { service, eventRepository } = makeHarness({
            state: state({ stage: STAGE.BOUGHT_ONCE }),
        });
        eventRepository.findOne.mockImplementation(async (where: any) =>
            where.kind === KIND.STAGE && where.newValue === undefined
                ? fallback
                : null
        );

        const detail = await service.getDetail('c1', 'w1');

        expect(detail.stageEvent).toEqual(
            expect.objectContaining({ id: 'e5' })
        );
    });

    it('shows why the customer is Khó chịu only while the flag is on', async () => {
        const hostileEvent = {
            id: 'e3',
            kind: KIND.HOSTILE,
            actor: ACTOR.OPERATOR,
            newValue: 'false',
            reason: 'nhầm',
            createdAt: new Date(),
        };
        const off = makeHarness({
            state: state({ hostile: false }),
            events: { [KIND.HOSTILE]: hostileEvent },
        });
        expect((await off.service.getDetail('c1', 'w1')).hostileEvent).toBe(
            null
        );

        const on = makeHarness({
            state: state({ hostile: true }),
            events: { [KIND.HOSTILE]: { ...hostileEvent, newValue: 'true' } },
        });
        expect((await on.service.getDetail('c1', 'w1')).hostileEvent).toEqual(
            expect.objectContaining({ id: 'e3' })
        );
    });

    it('gives the free-message window per channel', async () => {
        const last = new Date(Date.now() - 18 * HOUR);
        const { service, conversationRepository } = makeHarness({
            state: state(),
            lastInbound: [
                {
                    channel: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                    lastInboundAt: last,
                },
                {
                    channel: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                    lastInboundAt: last,
                },
            ],
        });

        const detail = await service.getDetail('c1', 'w1');

        expect(
            conversationRepository.lastInboundByChannel
        ).toHaveBeenCalledWith('c1', 'w1');
        expect(detail.freeWindows).toEqual([
            {
                channel: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                lastInboundAt: last,
                openUntil: new Date(last.getTime() + 24 * HOUR),
            },
        ]);
    });

    it('reads a customer with no label row yet as Mới biết, Chưa đồng ý', async () => {
        const { service } = makeHarness({ state: null });
        const detail = await service.getDetail('c1', 'w1');
        expect(detail).toEqual(
            expect.objectContaining({
                stage: STAGE.NEW,
                permission: PERMISSION.PENDING,
                hostile: false,
                dormant: false,
                stageEvent: null,
                permissionEvent: null,
                freeWindows: [],
            })
        );
    });

    it('404s a customer of another workspace', async () => {
        const { service } = makeHarness({ state: state() });
        await expect(service.getDetail('c1', 'other')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });
});

describe('CustomerMarketingService.getDetail, Với nhóm hàng and Nguồn đầu tiên', () => {
    it('lists the active "Tạm hoãn" reactions', async () => {
        const until = new Date('2026-12-15T16:59:59Z');

        const { service, reactionRepository } = makeHarness({
            state: state(),
            reactions: [
                {
                    productGroup: { id: 'g1', name: 'Serum' },
                    until,
                    reason: 'để sau nha',
                },
            ],
        });

        const detail = await service.getDetail('c1', 'w1');

        expect(reactionRepository.findActiveByCustomer).toHaveBeenCalledWith(
            'c1'
        );
        expect(detail.reactions).toEqual([
            {
                productGroupId: 'g1',
                productGroupName: 'Serum',
                until,
                reason: 'để sau nha',
            },
        ]);
    });

    it('names the first source and the code the customer came through', async () => {
        const at = new Date('2026-11-10T12:42:00Z');

        const { service, stateRepository } = makeHarness({
            state: state({ firstTrackedLink: KOL_CODE, firstSourceAt: at }),
        });

        const detail = await service.getDetail('c1', 'w1');

        expect(stateRepository.populateFirstSource).toHaveBeenCalled();
        expect(detail.firstSource).toEqual({
            sourceId: 's1',
            sourceName: 'Tờ rơi Tết',
            codeName: 'KOL Minh Thư',
            channel: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            at,
        });
    });

    it('gives a source without codes no code name, and none without a source', async () => {
        const link = {
            id: 's2',
            name: 'Trang sản phẩm',
            kind: ENUM_TRACKED_LINK_KIND.LINK,
            parent: null,
            account: { type: ENUM_ACCOUNT_TYPE.ZALO_PAGE },
        } as any;

        const at = new Date('2026-11-01T00:00:00Z');

        const withLink = makeHarness({
            state: state({ firstTrackedLink: link, firstSourceAt: at }),
        });

        expect(
            (await withLink.service.getDetail('c1', 'w1')).firstSource
        ).toEqual({
            sourceId: 's2',
            sourceName: 'Trang sản phẩm',
            codeName: null,
            channel: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
            at,
        });

        const direct = makeHarness({ state: state() });
        expect(
            (await direct.service.getDetail('c1', 'w1')).firstSource
        ).toBeNull();
    });
});

describe('CustomerMarketingService.summarize', () => {
    it('gives each customer its labels, defaults when it has no row', async () => {
        const old = new Date(Date.now() - 200 * 24 * HOUR);
        const { service, stateRepository } = makeHarness({
            states: [
                state({
                    customer: { id: 'c1' } as any,
                    stage: STAGE.BOUGHT_ONCE,
                    permission: PERMISSION.GRANTED,
                    lastInboundAt: old,
                }),
            ],
        });

        const summaries = await service.summarize(['c1', 'c2']);

        expect(stateRepository.find).toHaveBeenCalledWith({
            customer: { $in: ['c1', 'c2'] },
        });
        expect(stateRepository.populateFirstSource).toHaveBeenCalled();
        expect(summaries.get('c1')).toEqual(
            expect.objectContaining({
                stage: STAGE.BOUGHT_ONCE,
                permission: PERMISSION.GRANTED,
                dormant: true,
            })
        );
        expect(summaries.get('c2')).toEqual(
            expect.objectContaining({
                stage: STAGE.NEW,
                permission: PERMISSION.PENDING,
                hostile: false,
                dormant: false,
            })
        );
    });

    it('gives each row its first source', async () => {
        const at = new Date('2026-11-10T12:42:00Z');

        const { service } = makeHarness({
            states: [
                state({
                    customer: { id: 'c1' } as any,
                    firstTrackedLink: KOL_CODE,
                    firstSourceAt: at,
                }),
            ],
        });

        const summaries = await service.summarize(['c1', 'c2']);

        expect(summaries.get('c1')?.firstSource).toEqual(
            expect.objectContaining({ sourceName: 'Tờ rơi Tết', at })
        );
        expect(summaries.get('c2')?.firstSource).toBeNull();
    });

    it('skips the query for an empty page', async () => {
        const { service, stateRepository } = makeHarness({});
        expect((await service.summarize([])).size).toBe(0);
        expect(stateRepository.find).not.toHaveBeenCalled();
    });
});

describe('CustomerMarketingService.applyChange', () => {
    it('applies Khó chịu, then stage, then permission, with one reason', async () => {
        const { service } = makeHarness({ state: state() });
        const calls: string[] = [];
        jest.spyOn(service, 'setHostile').mockImplementation(async () => {
            calls.push('hostile');
            return state();
        });
        jest.spyOn(service, 'setStage').mockImplementation(async () => {
            calls.push('stage');
            return state();
        });
        jest.spyOn(service, 'setPermission').mockImplementation(async () => {
            calls.push('permission');
            return state();
        });
        const until = new Date('2026-12-01T00:00:00Z');
        const context = {
            actor: ACTOR.CLIENT,
            reason: 'from MCP',
            userId: 'u1',
        };

        await service.applyChange(
            'c1',
            'w1',
            {
                stage: STAGE.ASKED_PRICE,
                permission: PERMISSION.PAUSED,
                permissionUntil: until,
                hostile: true,
                reason: 'from MCP',
            },
            context
        );

        expect(calls).toEqual(['hostile', 'stage', 'permission']);
        expect(service.setPermission).toHaveBeenCalledWith(
            'c1',
            'w1',
            PERMISSION.PAUSED,
            context,
            until
        );
    });

    it('leaves untouched layers alone', async () => {
        const { service } = makeHarness({ state: state() });
        const setStage = jest.spyOn(service, 'setStage');
        const setHostile = jest.spyOn(service, 'setHostile');
        jest.spyOn(service, 'setPermission').mockResolvedValue(state());

        await service.applyChange(
            'c1',
            'w1',
            {
                permission: PERMISSION.GRANTED,
                reason: 'khách đồng ý qua điện thoại',
            },
            { actor: ACTOR.OPERATOR, reason: 'x' }
        );

        expect(setStage).not.toHaveBeenCalled();
        expect(setHostile).not.toHaveBeenCalled();
    });
});

describe('CustomerMarketingService.customerListFilter', () => {
    it('hands the label filters to the repository', () => {
        const { service, stateRepository } = makeHarness({});
        const filter = { stages: [STAGE.NEW], dormant: true };
        expect(service.customerListFilter(filter)).toEqual({ marker: true });
        expect(stateRepository.customerListFilter).toHaveBeenCalledWith(filter);
    });
});

// How long the shop may still message a customer for free on each channel,
// counted from the customer's last message there.

const NOW = new Date('2026-11-11T10:00:00Z');
const ago = (hours: number) => new Date(NOW.getTime() - hours * HOUR);
// Stands in for each channel adapter's freeMessageWindowHours.
const HOURS: Partial<Record<ENUM_ACCOUNT_TYPE, number | null>> = {
    [ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE]: 24,
    [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE]: 24,
    [ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS]: 24,
    [ENUM_ACCOUNT_TYPE.ZALO_PAGE]: 48,
    [ENUM_ACCOUNT_TYPE.TELEGRAM_BOT]: null,
};
const windowHours = (channel: ENUM_ACCOUNT_TYPE) => HOURS[channel];

describe('customerMarketingFreeWindows', () => {
    it("counts each channel's hours from the last message, newest first", () => {
        const windows = customerMarketingFreeWindows(
            [
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
                {
                    channel: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                    lastInboundAt: ago(30),
                },
            ],
            windowHours
        );

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
            customerMarketingFreeWindows(
                [
                    {
                        channel: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
                        lastInboundAt: ago(500),
                    },
                ],
                windowHours
            )
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
            customerMarketingFreeWindows(
                [
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
                ],
                windowHours
            )
        ).toEqual([]);
    });
});
