import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { NotFoundException } from '@nestjs/common';
import { CustomerAdminController } from 'src/modules/customer/controllers/customer.admin.controller';

describe('CustomerAdminController', () => {
    const customerAdminService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOneById: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(3) };
    const controller = new CustomerAdminController(
        customerAdminService as any,
        paginationService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists customers across workspaces with every filter, paged, id breaking ties', async () => {
        const rows = [{ id: 'c1' }];
        customerAdminService.findAll.mockResolvedValue(rows);
        customerAdminService.getTotal.mockResolvedValue(41);
        const search = { $or: [{ name: /lan/i }] };
        const find = {
            ...search,
            workspace: { $eq: 'w1' },
            tag: { $eq: 't1' },
            platform: { $in: ['ZALO_PAGE'] },
        };

        const result = await controller.list(
            {
                _search: search,
                _limit: 20,
                _offset: 20,
                _order: { createdAt: 'desc' },
            } as any,
            { workspace: { $eq: 'w1' } },
            { tag: { $eq: 't1' } },
            { platform: { $in: ['ZALO_PAGE'] } }
        );

        expect(customerAdminService.findAll).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 20,
            order: {
                createdAt: 'desc',
                id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
            },
        });
        expect(customerAdminService.getTotal).toHaveBeenCalledWith(find);
        expect(paginationService.totalPage).toHaveBeenCalledWith(41, 20);
        expect(result).toEqual({
            _pagination: { total: 41, totalPage: 3 },
            data: rows,
        });
    });

    it('lists without filters', async () => {
        customerAdminService.findAll.mockResolvedValue([]);
        customerAdminService.getTotal.mockResolvedValue(0);

        await controller.list({
            _limit: 20,
            _offset: 0,
            _order: { createdAt: 'desc' },
        } as any);

        expect(customerAdminService.findAll).toHaveBeenCalledWith(
            {},
            expect.any(Object)
        );
    });

    it('returns one customer', async () => {
        customerAdminService.findOneById.mockResolvedValue({ id: 'c1' });

        await expect(controller.get('c1')).resolves.toEqual({
            data: { id: 'c1' },
        });
        expect(customerAdminService.findOneById).toHaveBeenCalledWith('c1');
    });

    it('answers 404 for an unknown or deleted customer', async () => {
        customerAdminService.findOneById.mockResolvedValue(null);

        const error = await controller.get('nope').catch(e => e);

        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.getResponse()).toMatchObject({
            message: 'customer.error.notFound',
        });
    });
});
