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

function makeHarness(customers: Record<string, string> = {}) {
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
    };
    const stateRepository = {
        findByCustomer: jest.fn(async (id: string) => states.get(id) ?? null),
    };
    const eventRepository = { findWithPaging: jest.fn() };
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
        customerRepository as any
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

    describe('mapGet', () => {
        it('shows Ngủ đông after 120 days without a message', () => {
            const { service } = makeHarness();
            const state = new CustomerMarketingStateEntity();
            state.lastInboundAt = new Date(Date.now() - 121 * 86_400_000);
            expect(service.mapGet(state).dormant).toBe(true);
            state.lastInboundAt = new Date(Date.now() - 10 * 86_400_000);
            expect(service.mapGet(state).dormant).toBe(false);
        });
    });
});
