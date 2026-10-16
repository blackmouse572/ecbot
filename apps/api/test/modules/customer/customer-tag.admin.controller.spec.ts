import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { CustomerTagAdminController } from 'src/modules/customer/controllers/customer-tag.admin.controller';

describe('CustomerTagAdminController', () => {
    const customerTagAdminService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(2) };
    const controller = new CustomerTagAdminController(
        customerTagAdminService as any,
        paginationService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists tags across workspaces filtered by workspace, paged, id breaking ties', async () => {
        const rows = [{ id: 't1' }];
        customerTagAdminService.findAll.mockResolvedValue(rows);
        customerTagAdminService.getTotal.mockResolvedValue(25);
        const search = { $or: [{ name: /vip/i }] };
        const find = { ...search, workspace: { $eq: 'w1' } };

        const result = await controller.list(
            {
                _search: search,
                _limit: 20,
                _offset: 0,
                _order: { createdAt: 'desc' },
            } as any,
            { workspace: { $eq: 'w1' } }
        );

        expect(customerTagAdminService.findAll).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 0,
            order: {
                createdAt: 'desc',
                id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
            },
        });
        expect(customerTagAdminService.getTotal).toHaveBeenCalledWith(find);
        expect(result).toEqual({
            _pagination: { total: 25, totalPage: 2 },
            data: rows,
        });
    });
});
