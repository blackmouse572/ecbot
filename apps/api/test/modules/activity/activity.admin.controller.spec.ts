import { ActivityAdminController } from '@app/modules/activity/controllers/activity.admin.controller';

describe('ActivityAdminController list', () => {
    const activityService = {
        findAllByUser: jest.fn().mockResolvedValue([]),
        getTotalByUser: jest.fn().mockResolvedValue(0),
        mapList: jest.fn().mockReturnValue([]),
    };
    const controller = new ActivityAdminController(
        { totalPage: jest.fn().mockReturnValue(0) } as any,
        activityService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('filters the user activities by action and subject', async () => {
        await controller.list(
            { id: 'u1' } as any,
            { _limit: 20, _offset: 0, _order: {} } as any,
            { action: { $in: ['create'] } },
            { subject: { $in: ['chatbot'] } }
        );

        const find = {
            action: { $in: ['create'] },
            subject: { $in: ['chatbot'] },
        };
        expect(activityService.findAllByUser).toHaveBeenCalledWith(
            'u1',
            find,
            expect.anything()
        );
        expect(activityService.getTotalByUser).toHaveBeenCalledWith('u1', find);
    });

    it('lists every activity when no filter is given', async () => {
        await controller.list(
            { id: 'u1' } as any,
            { _limit: 20, _offset: 0, _order: {} } as any
        );

        expect(activityService.findAllByUser).toHaveBeenCalledWith(
            'u1',
            {},
            expect.anything()
        );
        expect(activityService.getTotalByUser).toHaveBeenCalledWith('u1', {});
    });
});
