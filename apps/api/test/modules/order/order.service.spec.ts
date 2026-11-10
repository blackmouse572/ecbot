import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import {
    ENUM_ORDER_SOURCE,
    ENUM_ORDER_STATUS,
} from 'src/modules/order/enums/order.enum';
import { OrderService } from 'src/modules/order/services/order.service';
import { ProductGroupService } from 'src/modules/order/services/product-group.service';

describe('OrderService', () => {
    const workspaceId = 'w1';
    const customer = {
        id: 'c1',
        name: 'Lan',
        phone: '0901234567',
        workspace: { id: workspaceId },
    };

    const orderRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        exists: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        getTotal: jest.fn(),
        replaceItems: jest.fn(),
    };
    const productGroupRepository = { find: jest.fn() };
    const customerRepository = { findOne: jest.fn() };
    const productGroupService = {
        refreshLearnedCycles: jest.fn(),
        findAll: jest.fn(),
        matchItemName: ProductGroupService.prototype.matchItemName,
    };

    const service = new OrderService(
        orderRepository as any,
        productGroupRepository as any,
        customerRepository as any,
        productGroupService as any
    );

    const order = (extra: Record<string, any> = {}) => ({
        id: 'o1',
        code: 'DH-261110-AB12',
        customer,
        status: ENUM_ORDER_STATUS.PENDING,
        source: ENUM_ORDER_SOURCE.CHAT,
        total: 0,
        currency: 'VND',
        orderedAt: new Date('2026-11-10T00:00:00Z'),
        items: { getItems: () => [{ productGroup: { id: 'g1' } }] },
        ...extra,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        customerRepository.findOne.mockResolvedValue(customer);
        productGroupRepository.find.mockResolvedValue([{ id: 'g1' }]);
        orderRepository.exists.mockResolvedValue(false);
        orderRepository.create.mockImplementation(async data => ({
            id: 'o1',
            ...data,
            items: { getItems: () => [{ productGroup: { id: 'g1' } }] },
        }));
        orderRepository.save.mockImplementation(async e => e);
        productGroupService.findAll.mockResolvedValue([
            { id: 'g1', name: 'Kem chống nắng' },
        ]);
    });

    describe('create', () => {
        it('sums the items when no total is given and generates a code', async () => {
            const created = await service.create(workspaceId, {
                customerId: 'c1',
                items: [
                    {
                        name: 'Kem chống nắng',
                        productGroupId: 'g1',
                        quantity: 2,
                        unitPrice: 150000,
                    },
                    { name: 'Túi quà', quantity: 1, unitPrice: 20000 },
                ],
                status: ENUM_ORDER_STATUS.PENDING,
                source: ENUM_ORDER_SOURCE.CHAT,
            });

            const data = orderRepository.create.mock.calls[0][0];
            expect(data.total).toBe(320000);
            expect(data.currency).toBe('VND');
            expect(data.code).toMatch(/^DH-\d{6}-[A-Z0-9]{4}$/);
            expect(created.status).toBe(ENUM_ORDER_STATUS.PENDING);
            expect(
                productGroupService.refreshLearnedCycles
            ).not.toHaveBeenCalled();
        });

        it('keeps a given total over the item sum', async () => {
            await service.create(workspaceId, {
                customerId: 'c1',
                items: [{ name: 'Serum', quantity: 1 }],
                total: 500000,
                status: ENUM_ORDER_STATUS.PENDING,
                source: ENUM_ORDER_SOURCE.IMPORT,
            });
            expect(orderRepository.create.mock.calls[0][0].total).toBe(500000);
        });

        it('confirms right away when created as CONFIRMED, through confirm', async () => {
            const onConfirmed = jest.spyOn(service, 'onConfirmed');
            const created = await service.create(workspaceId, {
                customerId: 'c1',
                items: [{ name: 'Serum', productGroupId: 'g1', quantity: 1 }],
                status: ENUM_ORDER_STATUS.CONFIRMED,
                source: ENUM_ORDER_SOURCE.MANUAL,
            });
            expect(created.status).toBe(ENUM_ORDER_STATUS.CONFIRMED);
            expect(created.confirmedAt).toBeInstanceOf(Date);
            expect(
                productGroupService.refreshLearnedCycles
            ).toHaveBeenCalledWith(['g1']);
            expect(onConfirmed).toHaveBeenCalledTimes(1);
        });

        it('rejects a customer outside the workspace', async () => {
            customerRepository.findOne.mockResolvedValue(null);
            await expect(
                service.create(workspaceId, {
                    customerId: 'c2',
                    items: [],
                    status: ENUM_ORDER_STATUS.PENDING,
                    source: ENUM_ORDER_SOURCE.MANUAL,
                })
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('rejects a product group outside the workspace', async () => {
            productGroupRepository.find.mockResolvedValue([]);
            await expect(
                service.create(workspaceId, {
                    customerId: 'c1',
                    items: [{ name: 'x', productGroupId: 'g9', quantity: 1 }],
                    status: ENUM_ORDER_STATUS.PENDING,
                    source: ENUM_ORDER_SOURCE.MANUAL,
                })
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects a code already used in the workspace', async () => {
            orderRepository.exists.mockResolvedValue(true);
            await expect(
                service.create(workspaceId, {
                    customerId: 'c1',
                    code: 'A-1',
                    items: [],
                    status: ENUM_ORDER_STATUS.PENDING,
                    source: ENUM_ORDER_SOURCE.MANUAL,
                })
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe('confirm', () => {
        it('confirms a pending order and refreshes its groups', async () => {
            orderRepository.findOne.mockResolvedValue(order());
            const confirmed = await service.confirm('o1', workspaceId);
            expect(confirmed.status).toBe(ENUM_ORDER_STATUS.CONFIRMED);
            expect(
                productGroupService.refreshLearnedCycles
            ).toHaveBeenCalledWith(['g1']);
        });

        it('refuses an order that is not pending', async () => {
            orderRepository.findOne.mockResolvedValue(
                order({ status: ENUM_ORDER_STATUS.CANCELLED })
            );
            await expect(
                service.confirm('o1', workspaceId)
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('404s an order from another workspace', async () => {
            orderRepository.findOne.mockResolvedValue(null);
            await expect(
                service.confirm('o1', workspaceId)
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('cancel', () => {
        it('refreshes the groups when a confirmed order is cancelled', async () => {
            orderRepository.findOne.mockResolvedValue(
                order({ status: ENUM_ORDER_STATUS.CONFIRMED })
            );
            const cancelled = await service.cancel('o1', workspaceId);
            expect(cancelled.status).toBe(ENUM_ORDER_STATUS.CANCELLED);
            expect(
                productGroupService.refreshLearnedCycles
            ).toHaveBeenCalledWith(['g1']);
        });

        it('does not touch the cycle when a pending order is cancelled', async () => {
            orderRepository.findOne.mockResolvedValue(order());
            await service.cancel('o1', workspaceId);
            expect(
                productGroupService.refreshLearnedCycles
            ).not.toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('refuses to edit a cancelled order', async () => {
            orderRepository.findOne.mockResolvedValue(
                order({ status: ENUM_ORDER_STATUS.CANCELLED })
            );
            await expect(
                service.update('o1', workspaceId, { note: 'x' })
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('replaces items and recomputes the total', async () => {
            const existing = order();
            orderRepository.findOne.mockResolvedValue(existing);
            await service.update('o1', workspaceId, {
                items: [{ name: 'Serum', quantity: 3, unitPrice: 100000 }],
            });
            expect(orderRepository.replaceItems).toHaveBeenCalled();
            expect(existing.total).toBe(300000);
        });

        it('keeps the total when the new items carry no prices', async () => {
            const existing = order({ total: 500000 });
            orderRepository.findOne.mockResolvedValue(existing);
            await service.update('o1', workspaceId, {
                items: [{ name: 'Serum', quantity: 2 }],
            });
            expect(existing.total).toBe(500000);
        });
    });

    describe('recordChatDraft', () => {
        const draft = {
            items: [
                {
                    name: 'Kem chống nắng SPF50',
                    quantity: 2,
                    unitPrice: 150000,
                },
                { name: 'Túi quà', quantity: 1 },
            ],
            note: 'Giao giờ hành chính',
            conversationId: 'conv-1',
        };

        it('creates a PENDING chat order with groups matched by name', async () => {
            orderRepository.findOne.mockResolvedValue(null);
            const created = await service.recordChatDraft('c1', draft);

            expect(orderRepository.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: workspaceId,
                    conversationId: 'conv-1',
                    status: ENUM_ORDER_STATUS.PENDING,
                    source: ENUM_ORDER_SOURCE.CHAT,
                })
            );
            const data = orderRepository.create.mock.calls[0][0];
            expect(data.status).toBe(ENUM_ORDER_STATUS.PENDING);
            expect(data.source).toBe(ENUM_ORDER_SOURCE.CHAT);
            expect(data.conversationId).toBe('conv-1');
            expect(data.total).toBe(300000);
            expect(data.items.map((i: any) => i.productGroup)).toEqual([
                'g1',
                undefined,
            ]);
            expect(created.status).toBe(ENUM_ORDER_STATUS.PENDING);
        });

        it('replaces the draft already noted in the same conversation', async () => {
            const existing = order({ conversationId: 'conv-1' });
            orderRepository.findOne.mockResolvedValue(existing);

            await service.recordChatDraft('c1', draft);

            expect(orderRepository.create).not.toHaveBeenCalled();
            expect(orderRepository.replaceItems).toHaveBeenCalledWith(
                existing,
                expect.arrayContaining([
                    expect.objectContaining({ productGroupId: 'g1' }),
                ])
            );
            expect(existing.total).toBe(300000);
        });

        it('creates a new order without a conversation to match', async () => {
            const { conversationId: _, ...noConversation } = draft;
            await service.recordChatDraft('c1', noConversation);
            expect(orderRepository.findOne).not.toHaveBeenCalled();
            expect(orderRepository.create).toHaveBeenCalled();
        });

        it('rejects an unknown customer', async () => {
            customerRepository.findOne.mockResolvedValue(null);
            await expect(
                service.recordChatDraft('c9', draft)
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
