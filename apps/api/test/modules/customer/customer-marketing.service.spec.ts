import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE as STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION as PERMISSION,
    ENUM_MARKETING_EVENT_ACTOR as ACTOR,
    ENUM_MARKETING_EVENT_KIND as KIND,
} from '../../../src/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingStateEntity } from '../../../src/modules/customer/repository/entities/customer-marketing-state.entity';
import { MarketingEventEntity } from '../../../src/modules/customer/repository/entities/marketing-event.entity';
import { CustomerMarketingService } from '../../../src/modules/customer/services/customer-marketing.service';

// Marketing labels per Customer: forward-only stage, permission with the
// "dừng" opt-out, one-time consent question, and merge rules. The EntityManager
// is an in-memory fake keyed by customer id.

function makeHarness(
    customers: Record<string, string> = {},
    // customer id -> number of confirmed orders
    confirmedOrders: Record<string, number> = {},
    reactions: any[] = []
) {
    // customer id -> workspace id
    const states = new Map<string, CustomerMarketingStateEntity>();
    const events: MarketingEventEntity[] = [];
    const em: any = {
        getReference: jest.fn((_e: any, id: string) => ({ id })),
        persist: jest.fn((entity: any) => {
            if (entity instanceof MarketingEventEntity) events.push(entity);
            if (entity instanceof CustomerMarketingStateEntity)
                states.set(entity.customer.id, entity);
            return em;
        }),
        flush: jest.fn().mockResolvedValue(undefined),
        fork: jest.fn(() => em),
        nativeDelete: jest.fn().mockResolvedValue(1),
        nativeUpdate: jest.fn().mockResolvedValue(1),
        find: jest.fn(async () => reactions),
        count: jest.fn(async (_entity: any, where: any) =>
            (where.customer.$in as string[]).reduce(
                (sum, id) => sum + (confirmedOrders[id] ?? 0),
                0
            )
        ),
    };
    const stateRepository = {
        findByCustomer: jest.fn(async (id: string) => states.get(id) ?? null),
    };
    const eventRepository = {
        findWithPaging: jest.fn(),
        getTotal: jest.fn(
            async (where: any) =>
                events.filter(
                    e =>
                        e.customer.id === where.customer &&
                        e.kind === where.kind &&
                        e.trackedLinkId === where.trackedLinkId &&
                        (e.conversationId ?? null) ===
                            (where.conversationId ?? null)
                ).length
        ),
    };
    const customerRepository = {
        findOne: jest.fn(async (where: any) =>
            customers[where.id] === where.workspace
                ? { id: where.id, workspace: { id: where.workspace } }
                : null
        ),
    };
    const service = new CustomerMarketingService(
        em,
        stateRepository as any,
        eventRepository as any,
        customerRepository as any,
        { get: jest.fn() } as any
    );
    return { service, states, events, em };
}

const bot = { actor: ACTOR.BOT, reason: 'test' };
const operator = { actor: ACTOR.OPERATOR, reason: 'called the shop' };

describe('CustomerMarketingService', () => {
    describe('recordInbound', () => {
        it('starts a new customer at Mới biết, with an event', async () => {
            const { service, states, events } = makeHarness();
            const result = await service.recordInbound({
                customerId: 'c1',
                workspaceId: 'w1',
                text: 'shop ơi còn hàng không',
                conversationId: 'conv-1',
            });
            expect(result).toEqual({ optedOut: false });
            expect(states.get('c1')?.stage).toBe(STAGE.NEW);
            expect(states.get('c1')?.permission).toBe(PERMISSION.PENDING);
            expect(states.get('c1')?.lastInboundAt).toBeInstanceOf(Date);
            expect(events).toEqual([
                expect.objectContaining({
                    kind: KIND.STAGE,
                    actor: ACTOR.RULE,
                    oldValue: null,
                    newValue: STAGE.NEW,
                    conversationId: 'conv-1',
                }),
            ]);
        });

        it('stops offers on "dừng", once, with the message linked', async () => {
            const { service, states, events } = makeHarness();
            await service.recordInbound({
                customerId: 'c1',
                workspaceId: 'w1',
                text: 'hi',
            });
            const result = await service.recordInbound({
                customerId: 'c1',
                workspaceId: 'w1',
                text: 'Dừng',
                conversationId: 'conv-1',
                messageId: 'msg-1',
            });
            expect(result).toEqual({ optedOut: true });
            expect(states.get('c1')?.permission).toBe(PERMISSION.STOPPED);
            expect(events.at(-1)).toEqual(
                expect.objectContaining({
                    kind: KIND.PERMISSION,
                    actor: ACTOR.RULE,
                    oldValue: PERMISSION.PENDING,
                    newValue: PERMISSION.STOPPED,
                    reason: 'opt_out_keyword',
                    messageId: 'msg-1',
                })
            );

            // A second "dừng" still confirms, but writes no new event.
            const count = events.length;
            await expect(
                service.recordInbound({
                    customerId: 'c1',
                    workspaceId: 'w1',
                    text: 'dung',
                })
            ).resolves.toEqual({ optedOut: true });
            expect(events).toHaveLength(count);
        });

        it('leaves the permission alone on an ordinary negative reply', async () => {
            const { service, states } = makeHarness();
            await service.recordInbound({
                customerId: 'c1',
                workspaceId: 'w1',
                text: 'không mua đâu, đừng nhắn nữa',
            });
            expect(states.get('c1')?.permission).toBe(PERMISSION.PENDING);
            expect(states.get('c1')?.stage).toBe(STAGE.NEW);
        });
    });

    describe('recordSource', () => {
        const arrival = {
            customerId: 'c1',
            workspaceId: 'w1',
            trackedLinkId: 'link-tet',
            promisesOffer: false,
            conversationId: 'conv-1',
            messageId: 'msg-1',
        };

        it('keeps the first source and logs every arrival', async () => {
            const { service, states, events } = makeHarness();
            await service.recordInbound({
                customerId: 'c1',
                workspaceId: 'w1',
            });

            expect(await service.recordSource(arrival)).toBe(states.get('c1'));
            const first = states.get('c1')!;
            expect(first.firstTrackedLink).toEqual({ id: 'link-tet' });
            expect(first.firstSourceAt).toBeInstanceOf(Date);

            await service.recordSource({
                ...arrival,
                trackedLinkId: 'link-kol',
                conversationId: 'conv-2',
            });
            expect(states.get('c1')!.firstTrackedLink).toEqual({
                id: 'link-tet',
            });
            expect(
                events
                    .filter(e => e.kind === KIND.SOURCE)
                    .map(e => [e.trackedLinkId, e.actor, e.messageId ?? null])
            ).toEqual([
                ['link-tet', ACTOR.RULE, 'msg-1'],
                ['link-kol', ACTOR.RULE, 'msg-1'],
            ]);
        });

        it('counts the same link once per conversation', async () => {
            const { service, events } = makeHarness();
            await service.recordSource(arrival);

            expect(await service.recordSource(arrival)).toBeNull();
            expect(events.filter(e => e.kind === KIND.SOURCE)).toHaveLength(1);
        });

        it('opts a pending customer in when the link promises an offer', async () => {
            const { service, states, events } = makeHarness();
            await service.recordSource({ ...arrival, promisesOffer: true });

            expect(states.get('c1')!.permission).toBe(PERMISSION.GRANTED);
            expect(events).toContainEqual(
                expect.objectContaining({
                    kind: KIND.PERMISSION,
                    actor: ACTOR.RULE,
                    newValue: PERMISSION.GRANTED,
                    reason: 'tracked_link',
                    trackedLinkId: 'link-tet',
                })
            );
        });

        it('never reopens a customer who said stop', async () => {
            const { service, states } = makeHarness();
            await service.recordInbound({
                customerId: 'c1',
                workspaceId: 'w1',
                text: 'dừng',
            });

            await service.recordSource({ ...arrival, promisesOffer: true });
            expect(states.get('c1')!.permission).toBe(PERMISSION.STOPPED);
        });
    });

    describe('setStage', () => {
        it('moves forward for the bot, never back', async () => {
            const { service, states } = makeHarness({ c1: 'w1' });
            await service.setStage('c1', 'w1', STAGE.ASKED_PRICE, bot);
            expect(states.get('c1')?.stage).toBe(STAGE.ASKED_PRICE);

            await service.setStage('c1', 'w1', STAGE.INTERESTED, bot);
            expect(states.get('c1')?.stage).toBe(STAGE.ASKED_PRICE);
        });

        it('lets an operator move it back', async () => {
            const { service, states, events } = makeHarness({ c1: 'w1' });
            await service.setStage('c1', 'w1', STAGE.BOUGHT_ONCE, bot);
            await service.setStage('c1', 'w1', STAGE.INTERESTED, operator);
            expect(states.get('c1')?.stage).toBe(STAGE.INTERESTED);
            expect(events.at(-1)).toEqual(
                expect.objectContaining({
                    actor: ACTOR.OPERATOR,
                    oldValue: STAGE.BOUGHT_ONCE,
                    newValue: STAGE.INTERESTED,
                    reason: 'called the shop',
                })
            );
        });

        it('refuses a customer of another workspace', async () => {
            const { service } = makeHarness({ c1: 'w1' });
            await expect(
                service.setStage('c1', 'w2', STAGE.INTERESTED, operator)
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('setPermission', () => {
        it('needs a future date to pause', async () => {
            const { service } = makeHarness({ c1: 'w1' });
            await expect(
                service.setPermission('c1', 'w1', PERMISSION.PAUSED, bot)
            ).rejects.toBeInstanceOf(BadRequestException);

            const until = new Date(Date.now() + 86_400_000);
            const state = await service.setPermission(
                'c1',
                'w1',
                PERMISSION.PAUSED,
                bot,
                until
            );
            expect(state.permissionUntil).toEqual(until);
        });

        it('reopens a stopped customer only with a reason', async () => {
            const { service, states } = makeHarness({ c1: 'w1' });
            await service.setPermission('c1', 'w1', PERMISSION.STOPPED, bot);
            await expect(
                service.setPermission('c1', 'w1', PERMISSION.GRANTED, {
                    actor: ACTOR.BOT,
                })
            ).rejects.toBeInstanceOf(BadRequestException);

            await service.setPermission('c1', 'w1', PERMISSION.GRANTED, {
                actor: ACTOR.BOT,
                reason: 'customer asked for the new menu offers',
            });
            expect(states.get('c1')?.permission).toBe(PERMISSION.GRANTED);
        });

        it('keeps a hostile customer stopped unless an operator reopens', async () => {
            const { service, states } = makeHarness({ c1: 'w1' });
            await service.setHostile('c1', 'w1', true, operator);
            expect(states.get('c1')?.permission).toBe(PERMISSION.STOPPED);

            await expect(
                service.setPermission('c1', 'w1', PERMISSION.GRANTED, bot)
            ).rejects.toBeInstanceOf(BadRequestException);
            await service.setPermission(
                'c1',
                'w1',
                PERMISSION.GRANTED,
                operator
            );
            expect(states.get('c1')?.permission).toBe(PERMISSION.GRANTED);
        });
    });

    describe('markConsentAsked', () => {
        it('lets the bot ask only once', async () => {
            const { service, events } = makeHarness({ c1: 'w1' });
            await expect(
                service.markConsentAsked('c1', 'w1', bot)
            ).resolves.toEqual({ alreadyAsked: false });
            await expect(
                service.markConsentAsked('c1', 'w1', bot)
            ).resolves.toEqual({ alreadyAsked: true });
            expect(
                events.filter(e => e.kind === KIND.CONSENT_ASKED)
            ).toHaveLength(1);
        });

        it('never lets the bot ask a customer who said stop', async () => {
            const { service } = makeHarness({ c1: 'w1' });
            await service.setPermission('c1', 'w1', PERMISSION.STOPPED, bot);
            await expect(
                service.markConsentAsked('c1', 'w1', bot)
            ).resolves.toEqual({ alreadyAsked: true });
        });
    });

    describe('mergeInto', () => {
        it('keeps the opt-out, the further stage and the hostile flag', async () => {
            const { service, states, events, em } = makeHarness({
                zalo: 'w1',
                messenger: 'w1',
            });
            // Zalo customer said "dừng"; Messenger customer bought once.
            await service.recordInbound({
                customerId: 'zalo',
                workspaceId: 'w1',
                text: 'dừng',
            });
            await service.setStage('messenger', 'w1', STAGE.BOUGHT_ONCE, bot);
            await service.setPermission(
                'messenger',
                'w1',
                PERMISSION.GRANTED,
                bot
            );

            await service.mergeInto('zalo', 'messenger', 'w1', em);

            const survivor = states.get('messenger');
            expect(survivor?.permission).toBe(PERMISSION.STOPPED);
            expect(survivor?.stage).toBe(STAGE.BOUGHT_ONCE);
            expect(events.at(-1)).toEqual(
                expect.objectContaining({
                    kind: KIND.PERMISSION,
                    actor: ACTOR.RULE,
                    oldValue: PERMISSION.GRANTED,
                    newValue: PERMISSION.STOPPED,
                    reason: 'customer_merge',
                })
            );
            // The loser keeps its own row, so an unmerge gets it back.
            expect(states.get('zalo')?.permission).toBe(PERMISSION.STOPPED);
        });

        it('keeps the earlier first source', async () => {
            const { service, states, em } = makeHarness();
            const arrival = {
                workspaceId: 'w1',
                promisesOffer: false,
            };
            await service.recordSource({
                ...arrival,
                customerId: 'zalo',
                trackedLinkId: 'link-early',
            });
            await service.recordSource({
                ...arrival,
                customerId: 'messenger',
                trackedLinkId: 'link-late',
            });
            states.get('zalo')!.firstSourceAt = new Date('2026-01-01');

            await service.mergeInto('zalo', 'messenger', 'w1', em);
            expect(states.get('messenger')?.firstTrackedLink).toEqual({
                id: 'link-early',
            });
        });

        it('gives the survivor the loser state when it has none', async () => {
            const { service, states, em } = makeHarness();
            await service.recordInbound({
                customerId: 'zalo',
                workspaceId: 'w1',
                text: 'stop',
            });
            await service.mergeInto('zalo', 'messenger', 'w1', em);
            expect(states.get('messenger')?.permission).toBe(
                PERMISSION.STOPPED
            );
        });
    });

    describe('onOrderConfirmed', () => {
        const confirmed = (id: string, orderedAt = new Date()) =>
            ({
                id,
                customer: { id: 'c1' },
                workspace: { id: 'w1' },
                orderedAt,
            }) as any;

        it('marks the first confirmed order Mua 1 lần, linked to the order', async () => {
            const { service, states, events } = makeHarness(
                { c1: 'w1' },
                { c1: 1 }
            );
            const orderedAt = new Date('2026-11-01T00:00:00Z');
            await service.onOrderConfirmed(confirmed('o1', orderedAt));
            expect(states.get('c1')?.stage).toBe(STAGE.BOUGHT_ONCE);
            expect(states.get('c1')?.lastOrderAt).toEqual(orderedAt);
            expect(events.at(-1)).toEqual(
                expect.objectContaining({
                    kind: KIND.STAGE,
                    actor: ACTOR.RULE,
                    newValue: STAGE.BOUGHT_ONCE,
                    reason: 'order_confirmed',
                    order: { id: 'o1' },
                })
            );
        });

        it('marks the second confirmed order Mua nhiều lần', async () => {
            const { service, states } = makeHarness({ c1: 'w1' }, { c1: 2 });
            await service.onOrderConfirmed(confirmed('o2'));
            expect(states.get('c1')?.stage).toBe(STAGE.BOUGHT_REPEAT);
        });

        it('never moves a repeat buyer back, and keeps the latest order date', async () => {
            const { service, states } = makeHarness({ c1: 'w1' }, { c1: 2 });
            const recent = new Date('2026-11-05T00:00:00Z');
            await service.onOrderConfirmed(confirmed('o2', recent));
            // An old imported order confirmed later.
            await service.onOrderConfirmed(
                confirmed('o0', new Date('2025-01-01T00:00:00Z'))
            );
            expect(states.get('c1')?.stage).toBe(STAGE.BOUGHT_REPEAT);
            expect(states.get('c1')?.lastOrderAt).toEqual(recent);
        });
    });

    describe('mergeInto with orders', () => {
        it('makes two one-time buyers one repeat buyer', async () => {
            const { service, states, em } = makeHarness(
                { zalo: 'w1', messenger: 'w1' },
                { zalo: 1, messenger: 1 }
            );
            await service.setStage('zalo', 'w1', STAGE.BOUGHT_ONCE, bot);
            await service.setStage('messenger', 'w1', STAGE.BOUGHT_ONCE, bot);
            await service.mergeInto('zalo', 'messenger', 'w1', em);
            expect(states.get('messenger')?.stage).toBe(STAGE.BOUGHT_REPEAT);
        });

        it('carries "Tạm hoãn" over, the later date winning, with events', async () => {
            const soon = new Date(Date.now() + 10 * 86_400_000);
            const later = new Date(Date.now() + 80 * 86_400_000);
            const row = (customer: string, group: string, until: Date) => ({
                id: `${customer}-${group}`,
                workspace: { id: 'w1' },
                customer: { id: customer },
                productGroup: { id: group },
                until,
                reason: customer,
            });
            const survivorSerum = row('messenger', 'serum', soon);
            const { service, em, events } = makeHarness(
                { zalo: 'w1', messenger: 'w1' },
                {},
                [
                    row('zalo', 'serum', later),
                    row('zalo', 'toner', soon),
                    survivorSerum,
                ]
            );
            // The loser never messaged, so it has no state row.
            const result = await service.mergeInto(
                'zalo',
                'messenger',
                'w1',
                em
            );
            expect(survivorSerum.until).toEqual(later);
            expect(result.replacedReactions).toEqual([
                {
                    id: 'messenger-serum',
                    until: soon.toISOString(),
                    reason: 'messenger',
                },
            ]);
            expect(result.createdReactions).toEqual([
                expect.objectContaining({
                    customer: { id: 'messenger' },
                    productGroup: { id: 'toner' },
                    until: soon,
                }),
            ]);
            const reactionEvents = events.filter(e => e.kind === KIND.REACTION);
            expect(reactionEvents).toHaveLength(2);
            expect(reactionEvents[0]).toEqual(
                expect.objectContaining({
                    actor: ACTOR.RULE,
                    reason: 'customer_merge',
                    customer: { id: 'messenger' },
                    productGroup: { id: 'serum' },
                    newValue: later.toISOString().slice(0, 10),
                })
            );
        });

        it('counts orders of a loser with no state row', async () => {
            const { service, states, em } = makeHarness(
                { zalo: 'w1', messenger: 'w1' },
                { zalo: 1, messenger: 1 }
            );
            await service.setStage('messenger', 'w1', STAGE.BOUGHT_ONCE, bot);
            await service.mergeInto('zalo', 'messenger', 'w1', em);
            expect(states.get('messenger')?.stage).toBe(STAGE.BOUGHT_REPEAT);
        });
    });

    describe('revertMergedReactions', () => {
        it('deletes the copies and restores replaced dates', async () => {
            const { service, em } = makeHarness();
            await service.revertMergedReactions(
                {
                    createdReactionIds: ['copy-1'],
                    replacedReactions: [
                        {
                            id: 'row-1',
                            until: '2026-12-01T00:00:00.000Z',
                            reason: 'later',
                        },
                    ],
                },
                em
            );
            expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
                id: { $in: ['copy-1'] },
            });
            expect(em.nativeUpdate).toHaveBeenCalledWith(
                expect.anything(),
                { id: 'row-1' },
                { until: new Date('2026-12-01T00:00:00.000Z'), reason: 'later' }
            );
        });
    });

    describe('dormant', () => {
        const summaryFor = async (state: CustomerMarketingStateEntity) => {
            const { service } = makeHarness();
            state.customer = { id: 'c1' } as any;
            (service as any).stateRepository.find = jest.fn(async () => [
                state,
            ]);
            return (await service.summarize(['c1'])).get('c1');
        };

        it('is not Lâu không nhắn while a recent order exists', async () => {
            const state = new CustomerMarketingStateEntity();
            state.lastInboundAt = new Date(Date.now() - 200 * 86_400_000);
            state.lastOrderAt = new Date(Date.now() - 30 * 86_400_000);
            expect((await summaryFor(state))?.dormant).toBe(false);
            state.lastOrderAt = new Date(Date.now() - 130 * 86_400_000);
            expect((await summaryFor(state))?.dormant).toBe(true);
        });

        it('shows Lâu không nhắn after 120 days without a message', async () => {
            const { service } = makeHarness();
            const state = new CustomerMarketingStateEntity();
            state.customer = { id: 'c1' } as any;
            (service as any).stateRepository.find = jest.fn(async () => [
                state,
            ]);
            state.lastInboundAt = new Date(Date.now() - 121 * 86_400_000);
            expect((await service.summarize(['c1'])).get('c1')?.dormant).toBe(
                true
            );
            state.lastInboundAt = new Date(Date.now() - 10 * 86_400_000);
            expect((await service.summarize(['c1'])).get('c1')?.dormant).toBe(
                false
            );
        });
    });
});
