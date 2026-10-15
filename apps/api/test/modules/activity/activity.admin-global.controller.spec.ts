import { ActivityAdminGlobalController } from 'src/modules/activity/controllers/activity.admin-global.controller';

describe('ActivityAdminGlobalController', () => {
    const activityService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        mapAdminList: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(2) };
    const controller = new ActivityAdminGlobalController(
        paginationService as any,
        activityService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists activities across all users with every filter applied, paged', async () => {
        const entities = [{ id: 'a1' }];
        const rows = [{ id: 'a1', action: 'UPDATE' }];
        activityService.findAll.mockResolvedValue(entities);
        activityService.getTotal.mockResolvedValue(21);
        activityService.mapAdminList.mockReturnValue(rows);

        const result = await controller.list(
            {
                _search: { $or: [{ by: { email: { $ilike: '%lan%' } } }] },
                _limit: 20,
                _offset: 20,
                _order: { createdAt: 'desc' },
            } as any,
            { action: { $in: ['UPDATE'] } },
            { subject: { $in: ['WORKSPACE'] } },
            { by: 'admin-1' },
            { user: 'user-1' },
            { workspace: 'w1' },
            { createdAt: { $gte: new Date('2026-10-01') } }
        );

        const find = {
            $or: [{ by: { email: { $ilike: '%lan%' } } }],
            action: { $in: ['UPDATE'] },
            subject: { $in: ['WORKSPACE'] },
            by: 'admin-1',
            user: 'user-1',
            workspace: 'w1',
            createdAt: { $gte: new Date('2026-10-01') },
        };
        expect(activityService.findAll).toHaveBeenCalledWith(find, {
            paging: { limit: 20, offset: 20 },
            order: { createdAt: 'desc' },
            populate: ['by', 'user', 'workspace'],
        });
        expect(activityService.getTotal).toHaveBeenCalledWith(find);
        expect(activityService.mapAdminList).toHaveBeenCalledWith(entities);
        expect(result).toEqual({
            _pagination: { total: 21, totalPage: 2 },
            data: rows,
        });
    });

    it('lists everything when no filter is set', async () => {
        activityService.findAll.mockResolvedValue([]);
        activityService.getTotal.mockResolvedValue(0);
        activityService.mapAdminList.mockReturnValue([]);

        await controller.list({ _limit: 20, _offset: 0 } as any);

        expect(activityService.getTotal).toHaveBeenCalledWith({});
    });
});
