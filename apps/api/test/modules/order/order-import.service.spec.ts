import {
    ENUM_ORDER_SOURCE,
    ENUM_ORDER_STATUS,
} from 'src/modules/order/enums/order.enum';
import { OrderImportService } from 'src/modules/order/services/order-import.service';

describe('OrderImportService', () => {
    const workspaceId = 'w1';

    const orderService = {
        create: jest.fn(),
        groupIds: jest.fn(),
    };
    const productGroupService = {
        findAll: jest.fn(),
        create: jest.fn(),
        refreshLearnedCycles: jest.fn(),
    };
    const orderRepository = { find: jest.fn() };
    const customerRepository = { find: jest.fn(), create: jest.fn() };

    const service = new OrderImportService(
        orderService as any,
        productGroupService as any,
        orderRepository as any,
        customerRepository as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
        orderRepository.find.mockResolvedValue([{ code: 'DH-OLD' }]);
        customerRepository.find.mockResolvedValue([
            { id: 'c-lan', phone: '+84 903 412 885' },
        ]);
        customerRepository.create.mockImplementation(async data => ({
            id: `c-${data.phone}`,
            ...data,
        }));
        productGroupService.findAll.mockResolvedValue([
            { id: 'g-serum', name: 'Serum' },
        ]);
        productGroupService.create.mockImplementation(async (_w, data) => ({
            id: `g-${data.name}`,
            ...data,
        }));
        orderService.create.mockImplementation(async (_w, input) => ({
            id: `o-${input.code ?? 'gen'}`,
            status: input.status,
            items: input.items,
        }));
        orderService.groupIds.mockImplementation(order =>
            order.items.flatMap(item =>
                item.productGroupId ? [item.productGroupId] : []
            )
        );
    });

    const rows = [
        // Two rows, one order with two items, for an existing customer
        // written another way.
        {
            code: 'DH-1',
            phone: '0903412885',
            item: 'Serum C',
            group: 'serum',
            quantity: 2,
            unitPrice: 100000,
            orderedAt: '03/10/2026 14:30',
        },
        {
            code: 'DH-1',
            phone: '0903412885',
            item: 'Tẩy trang',
            group: 'Tẩy trang',
        },
        // Already imported.
        { code: 'DH-OLD', phone: '0903412885', item: 'Serum' },
        // A new customer, known by total only, no code.
        { phone: '0911222333', name: ' Hà ', total: 450000 },
        // Invalid rows.
        { code: 'DH-2', item: 'Serum' },
        { code: 'DH-3', phone: '0911', item: 'Serum', orderedAt: '31/02/2026' },
        { code: 'DH-4', phone: '0911' },
        { code: 'DH-5', phone: 'chưa có', item: 'Serum' },
    ];

    it('previews the counts without writing anything', async () => {
        const result = await service.import(workspaceId, rows as any, true);

        expect(result).toEqual({
            dryRun: true,
            orders: 2,
            skipped: 1,
            newCustomers: 1,
            newGroups: ['Tẩy trang'],
            invalidRows: [
                { row: 5, reason: 'missingPhone' },
                { row: 6, reason: 'badDate' },
                { row: 7, reason: 'empty' },
                { row: 8, reason: 'missingPhone' },
            ],
        });
        expect(orderRepository.find).toHaveBeenCalledWith(
            { workspace: workspaceId, code: { $in: ['DH-1', 'DH-OLD'] } },
            { populate: [] }
        );
        const phones = customerRepository.find.mock.calls[0][0].phone.$in;
        expect(phones).toEqual(
            expect.arrayContaining(['0903412885', '+84903412885', '911222333'])
        );
        expect(productGroupService.create).not.toHaveBeenCalled();
        expect(customerRepository.create).not.toHaveBeenCalled();
        expect(orderService.create).not.toHaveBeenCalled();
    });

    it('creates groups, customers and confirmed orders, then refreshes cycles once', async () => {
        const result = await service.import(workspaceId, rows as any, false);

        expect(result.orders).toBe(2);
        expect(productGroupService.create).toHaveBeenCalledWith(workspaceId, {
            name: 'Tẩy trang',
        });
        expect(customerRepository.create).toHaveBeenCalledTimes(1);
        expect(customerRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ phone: '0911222333', name: 'Hà' })
        );

        const [first, second] = orderService.create.mock.calls;
        expect(first[1]).toEqual({
            customerId: 'c-lan',
            code: 'DH-1',
            items: [
                {
                    name: 'Serum C',
                    productGroupId: 'g-serum',
                    quantity: 2,
                    unitPrice: 100000,
                },
                {
                    name: 'Tẩy trang',
                    productGroupId: 'g-Tẩy trang',
                    quantity: 1,
                    unitPrice: null,
                },
            ],
            total: undefined,
            status: ENUM_ORDER_STATUS.CONFIRMED,
            source: ENUM_ORDER_SOURCE.IMPORT,
            orderedAt: new Date(Date.UTC(2026, 9, 3, 14, 30)),
        });
        expect(first[2]).toEqual({ refreshCycles: false });
        expect(second[1]).toMatchObject({
            customerId: 'c-0911222333',
            code: undefined,
            items: [],
            total: 450000,
        });

        expect(productGroupService.refreshLearnedCycles).toHaveBeenCalledTimes(
            1
        );
        expect(productGroupService.refreshLearnedCycles).toHaveBeenCalledWith([
            'g-serum',
            'g-Tẩy trang',
        ]);
    });

    it('reports an order that fails and keeps going', async () => {
        orderService.create.mockRejectedValueOnce(new Error('boom'));

        const result = await service.import(workspaceId, rows as any, false);

        expect(result.orders).toBe(1);
        expect(result.invalidRows).toContainEqual({ row: 1, reason: 'failed' });
    });

    it('does not count pending orders toward the learned cycles', async () => {
        await service.import(
            workspaceId,
            [
                {
                    code: 'DH-9',
                    phone: '0903412885',
                    item: 'Serum',
                    group: 'Serum',
                    status: ENUM_ORDER_STATUS.PENDING,
                },
            ] as any,
            false
        );
        expect(productGroupService.refreshLearnedCycles).toHaveBeenCalledWith(
            []
        );
    });
});
