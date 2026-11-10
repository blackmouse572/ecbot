import { NotFoundException } from '@nestjs/common';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE as STAGE,
    ENUM_MARKETING_EVENT_ACTOR as ACTOR,
    ENUM_MARKETING_EVENT_KIND as KIND,
} from '../../../src/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingStateEntity } from '../../../src/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerProductReactionEntity } from '../../../src/modules/customer/repository/entities/customer-product-reaction.entity';
import { MarketingEventEntity } from '../../../src/modules/customer/repository/entities/marketing-event.entity';
import { CustomerMarketingService } from '../../../src/modules/customer/services/customer-marketing.service';
import { CustomerProductMarketingService } from '../../../src/modules/customer/services/customer-product-marketing.service';

// "Tạm hoãn <product group> đến <date>" and dated intent per product group.
// The EntityManager is an in-memory fake.

const DAY = 86_400_000;

function makeHarness() {
    const customers: Record<string, string> = { c1: 'w1' };
    const groups: Record<string, string> = { serum: 'w1', other: 'w2' };
    const states = new Map<string, CustomerMarketingStateEntity>();
    const reactions: CustomerProductReactionEntity[] = [];
    const events: MarketingEventEntity[] = [];
    const em: any = {
        getReference: jest.fn((_e: any, id: string) => ({ id })),
        persist: jest.fn((entity: any) => {
            if (entity instanceof MarketingEventEntity) events.push(entity);
            if (entity instanceof CustomerMarketingStateEntity)
                states.set(entity.customer.id, entity);
            if (
                entity instanceof CustomerProductReactionEntity &&
                !reactions.includes(entity)
            )
                reactions.push(entity);
            return em;
        }),
        remove: jest.fn((entity: any) => {
            reactions.splice(reactions.indexOf(entity), 1);
            return em;
        }),
        flush: jest.fn().mockResolvedValue(undefined),
        fork: jest.fn(() => em),
        count: jest.fn(async (_e: any, where: any) =>
            where.kind
                ? events.filter(
                      e =>
                          e.customer.id === where.customer &&
                          e.kind === where.kind &&
                          e.messageId === where.messageId &&
                          (e.productGroup?.id ?? null) === where.productGroup
                  ).length
                : 0
        ),
        findOne: jest.fn(async (_e: any, where: any) =>
            groups[where.id] === where.workspace ? { id: where.id } : null
        ),
    };
    const stateRepository = {
        findByCustomer: jest.fn(async (id: string) => states.get(id) ?? null),
    };
    const customerRepository = {
        findOne: jest.fn(async (where: any) =>
            customers[where.id] === where.workspace ? { id: where.id } : null
        ),
    };
    const reactionRepository = {
        findOne: jest.fn(
            async (where: any) =>
                reactions.find(
                    r =>
                        r.customer.id === where.customer &&
                        r.productGroup.id === where.productGroup
                ) ?? null
        ),
    };
    const marketingService = new CustomerMarketingService(
        em,
        stateRepository as any,
        {} as any,
        customerRepository as any
    );
    const service = new CustomerProductMarketingService(
        em,
        reactionRepository as any,
        marketingService
    );
    return { service, states, reactions, events };
}

const classifier = {
    actor: ACTOR.CLASSIFIER,
    reason: 'serum để sau nha',
    conversationId: 'conv-1',
    messageId: 'msg-1',
};

describe('CustomerProductMarketingService', () => {
    describe('deferProductGroup', () => {
        it('postpones one product group with an event', async () => {
            const { service, reactions, events } = makeHarness();
            const until = new Date(Date.now() + 60 * DAY);
            await service.deferProductGroup(
                'c1',
                'w1',
                'serum',
                until,
                classifier
            );
            expect(reactions).toHaveLength(1);
            expect(reactions[0].until).toEqual(until);
            expect(reactions[0].reason).toBe('serum để sau nha');
            expect(events.at(-1)).toEqual(
                expect.objectContaining({
                    kind: KIND.REACTION,
                    actor: ACTOR.CLASSIFIER,
                    oldValue: null,
                    newValue: until.toISOString().slice(0, 10),
                    productGroup: { id: 'serum' },
                    messageId: 'msg-1',
                })
            );
        });

        it('extends the same row when the customer says later again', async () => {
            const { service, reactions, events } = makeHarness();
            const first = new Date(Date.now() + 60 * DAY);
            const second = new Date(Date.now() + 90 * DAY);
            await service.deferProductGroup('c1', 'w1', 'serum', first, {
                ...classifier,
                messageId: 'msg-1',
            });
            await service.deferProductGroup('c1', 'w1', 'serum', second, {
                ...classifier,
                messageId: 'msg-2',
            });
            expect(reactions).toHaveLength(1);
            expect(reactions[0].until).toEqual(second);
            expect(events.at(-1)?.oldValue).toBe(
                first.toISOString().slice(0, 10)
            );
        });

        it('writes once per message, so the classifier can re-read a chat', async () => {
            const { service, events } = makeHarness();
            const until = new Date(Date.now() + 60 * DAY);
            await service.deferProductGroup(
                'c1',
                'w1',
                'serum',
                until,
                classifier
            );
            await service.deferProductGroup(
                'c1',
                'w1',
                'serum',
                until,
                classifier
            );
            expect(events.filter(e => e.kind === KIND.REACTION)).toHaveLength(
                1
            );
        });

        it('ignores a date already past (an old message in the backfill)', async () => {
            const { service, reactions, events } = makeHarness();
            await service.deferProductGroup(
                'c1',
                'w1',
                'serum',
                new Date(Date.now() - DAY),
                classifier
            );
            expect(reactions).toHaveLength(0);
            expect(events).toHaveLength(0);
        });

        it('refuses a product group of another workspace', async () => {
            const { service } = makeHarness();
            await expect(
                service.deferProductGroup(
                    'c1',
                    'w1',
                    'other',
                    new Date(Date.now() + DAY),
                    classifier
                )
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('clearProductGroup', () => {
        it('lets an operator offer the group again, with an event', async () => {
            const { service, reactions, events } = makeHarness();
            await service.deferProductGroup(
                'c1',
                'w1',
                'serum',
                new Date(Date.now() + 60 * DAY),
                classifier
            );
            await service.clearProductGroup('c1', 'w1', 'serum', {
                actor: ACTOR.OPERATOR,
                reason: 'customer asked again',
                userId: 'u1',
            });
            expect(reactions).toHaveLength(0);
            expect(events.at(-1)).toEqual(
                expect.objectContaining({
                    kind: KIND.REACTION,
                    actor: ACTOR.OPERATOR,
                    newValue: null,
                })
            );
        });
    });

    describe('recordIntent', () => {
        it('dates the intent at the message and moves the stage forward', async () => {
            const { service, states, events } = makeHarness();
            const occurredAt = new Date('2026-09-01T08:00:00Z');
            await service.recordIntent(
                'c1',
                'w1',
                {
                    stage: STAGE.ASKED_PRICE,
                    productGroupId: 'serum',
                    occurredAt,
                },
                classifier
            );
            expect(events[0]).toEqual(
                expect.objectContaining({
                    kind: KIND.INTENT,
                    newValue: STAGE.ASKED_PRICE,
                    productGroup: { id: 'serum' },
                    createdAt: occurredAt,
                })
            );
            expect(states.get('c1')?.stage).toBe(STAGE.ASKED_PRICE);
        });

        it('never moves the stage back for a repeat buyer', async () => {
            const { service, states } = makeHarness();
            const marketing = (service as any).marketingService;
            await marketing.setStage('c1', 'w1', STAGE.BOUGHT_REPEAT, {
                actor: ACTOR.RULE,
            });
            await service.recordIntent(
                'c1',
                'w1',
                { stage: STAGE.INTERESTED, occurredAt: new Date() },
                classifier
            );
            expect(states.get('c1')?.stage).toBe(STAGE.BOUGHT_REPEAT);
        });

        it('writes once per message and product group', async () => {
            const { service, events } = makeHarness();
            const input = {
                stage: STAGE.INTERESTED as const,
                productGroupId: 'serum',
                occurredAt: new Date(),
            };
            await service.recordIntent('c1', 'w1', input, classifier);
            await service.recordIntent('c1', 'w1', input, classifier);
            expect(events.filter(e => e.kind === KIND.INTENT)).toHaveLength(1);
        });
    });
});
