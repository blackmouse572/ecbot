import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '../../../src/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingSignalService } from '../../../src/modules/customer/services/customer-marketing-signal.service';

const DAY_MS = 86_400_000;

describe('CustomerMarketingSignalService (#500)', () => {
    const productMarketing = {
        recordIntent: jest.fn(),
        deferProductGroup: jest.fn(),
    };
    const marketing = { setHostile: jest.fn() };
    const eventRepository = { getTotal: jest.fn() };
    const productGroupRepository = { find: jest.fn() };
    const reactionRepository = { findOne: jest.fn() };
    let service: CustomerMarketingSignalService;

    const sentAt = new Date(Date.now() - 2 * DAY_MS);
    const messages = [
        { id: 'msg-0', dateSent: sentAt },
        { id: 'msg-1', dateSent: sentAt },
        { id: 'msg-2', dateSent: sentAt },
    ];
    const target = {
        customerId: 'cust-1',
        workspaceId: 'ws-1',
        conversationId: 'conv-1',
        messages,
    };
    const context = (messageId: string, reason: string) => ({
        actor: ENUM_MARKETING_EVENT_ACTOR.CLASSIFIER,
        reason,
        conversationId: 'conv-1',
        messageId,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        eventRepository.getTotal.mockResolvedValue(0);
        reactionRepository.findOne.mockResolvedValue(null);
        service = new CustomerMarketingSignalService(
            productMarketing as any,
            marketing as any,
            eventRepository as any,
            productGroupRepository as any,
            reactionRepository as any
        );
    });

    it('"serum để sau nha" postpones Serum 60 days from the message and leaves the stage alone', async () => {
        await service.apply(target, [
            {
                kind: 'later',
                product_group_id: 'pg-serum',
                defer_days: 60,
                message_index: 2,
                quote: 'serum để sau nha',
            },
        ]);

        expect(productMarketing.deferProductGroup).toHaveBeenCalledWith(
            'cust-1',
            'ws-1',
            'pg-serum',
            new Date(sentAt.getTime() + 60 * DAY_MS),
            context('msg-2', 'serum để sau nha')
        );
        expect(productMarketing.recordIntent).not.toHaveBeenCalled();
        expect(marketing.setHostile).not.toHaveBeenCalled();
    });

    it('keeps a longer "Tạm hoãn" when an older message would shorten it', async () => {
        // The backfill reads newest first: an older "để sau" comes after a
        // newer one and must not cut the newer postpone short.
        reactionRepository.findOne.mockResolvedValue({
            until: new Date(sentAt.getTime() + 90 * DAY_MS),
        });

        const applied = await service.apply(target, [
            {
                kind: 'later',
                product_group_id: 'pg-serum',
                defer_days: 60,
                message_index: 2,
                quote: 'x',
            },
        ]);

        expect(reactionRepository.findOne).toHaveBeenCalledWith({
            customer: 'cust-1',
            productGroup: 'pg-serum',
        });
        expect(productMarketing.deferProductGroup).not.toHaveBeenCalled();
        expect(applied).toBe(0);
    });

    it('records interest and a price question dated at the message', async () => {
        await service.apply(target, [
            {
                kind: 'interest',
                product_group_id: null,
                message_index: 0,
                quote: 'shop có son không',
            },
            {
                kind: 'asked_price',
                product_group_id: 'pg-serum',
                message_index: 1,
                quote: 'serum giá sao',
            },
        ]);

        expect(productMarketing.recordIntent).toHaveBeenCalledWith(
            'cust-1',
            'ws-1',
            {
                stage: ENUM_CUSTOMER_JOURNEY_STAGE.INTERESTED,
                productGroupId: null,
                occurredAt: sentAt,
            },
            context('msg-0', 'shop có son không')
        );
        expect(productMarketing.recordIntent).toHaveBeenCalledWith(
            'cust-1',
            'ws-1',
            {
                stage: ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE,
                productGroupId: 'pg-serum',
                occurredAt: sentAt,
            },
            context('msg-1', 'serum giá sao')
        );
    });

    it('records the price question first when one message has both', async () => {
        // The intent is deduplicated per message and group: the first one
        // written wins, so it must be the one further along.
        await service.apply(target, [
            {
                kind: 'interest',
                product_group_id: 'pg-serum',
                message_index: 0,
                quote: 'a',
            },
            {
                kind: 'asked_price',
                product_group_id: 'pg-serum',
                message_index: 0,
                quote: 'b',
            },
        ]);

        const stages = productMarketing.recordIntent.mock.calls.map(
            call => call[2].stage
        );
        expect(stages).toEqual([
            ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE,
            ENUM_CUSTOMER_JOURNEY_STAGE.INTERESTED,
        ]);
    });

    it('marks the customer Khó chịu from a hostile message', async () => {
        await service.apply(target, [
            {
                kind: 'hostile',
                product_group_id: null,
                message_index: 1,
                quote: 'đồ lừa đảo',
            },
        ]);

        expect(marketing.setHostile).toHaveBeenCalledWith(
            'cust-1',
            'ws-1',
            true,
            context('msg-1', 'đồ lừa đảo')
        );
    });

    it('does not flag a message again, or one an operator decided on later', async () => {
        eventRepository.getTotal.mockResolvedValue(1);

        await service.apply(target, [
            {
                kind: 'hostile',
                product_group_id: null,
                message_index: 1,
                quote: 'x',
            },
        ]);

        expect(eventRepository.getTotal).toHaveBeenCalledWith({
            customer: 'cust-1',
            kind: ENUM_MARKETING_EVENT_KIND.HOSTILE,
            $or: [
                { messageId: 'msg-1' },
                {
                    actor: {
                        $in: [
                            ENUM_MARKETING_EVENT_ACTOR.OPERATOR,
                            ENUM_MARKETING_EVENT_ACTOR.CLIENT,
                        ],
                    },
                    createdAt: { $gt: sentAt },
                },
            ],
        });
        expect(marketing.setHostile).not.toHaveBeenCalled();
    });

    it('ignores a signal that points at no message, or of an unknown kind', async () => {
        await service.apply(target, [
            {
                kind: 'interest',
                product_group_id: null,
                message_index: 7,
                quote: 'x',
            },
            {
                kind: 'later',
                product_group_id: null,
                message_index: 0,
                quote: 'x',
            },
            {
                kind: 'complaint' as any,
                product_group_id: null,
                message_index: 0,
                quote: 'x',
            },
        ]);

        expect(productMarketing.recordIntent).not.toHaveBeenCalled();
        expect(productMarketing.deferProductGroup).not.toHaveBeenCalled();
        expect(marketing.setHostile).not.toHaveBeenCalled();
    });

    it('keeps applying the rest when one signal fails', async () => {
        productMarketing.deferProductGroup.mockRejectedValueOnce(
            new Error('group deleted')
        );

        const applied = await service.apply(target, [
            {
                kind: 'later',
                product_group_id: 'pg-gone',
                defer_days: 60,
                message_index: 2,
                quote: 'x',
            },
            {
                kind: 'interest',
                product_group_id: null,
                message_index: 0,
                quote: 'y',
            },
        ]);

        expect(productMarketing.recordIntent).toHaveBeenCalledTimes(1);
        expect(applied).toBe(1);
    });

    it('lists the product groups for the classifier, by name', async () => {
        productGroupRepository.find.mockResolvedValue([
            { id: 'pg-1', name: 'Serum', extra: 'x' },
        ]);

        await expect(service.listProductGroups('ws-1')).resolves.toEqual([
            { id: 'pg-1', name: 'Serum' },
        ]);
        expect(productGroupRepository.find).toHaveBeenCalledWith(
            { workspace: 'ws-1' },
            expect.objectContaining({ orderBy: { name: 'ASC' } })
        );
    });
});
