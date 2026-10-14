import { DatabaseService } from '@app/common/database/services/database.service';
import { HelperArrayService } from '@app/common/helper/services/helper.array.service';
import { PaginationFilterInEnumPipe } from '@app/common/pagination/pipes/pagination.filter-in-enum.pipe';
import { ActivityAdminController } from '@app/modules/activity/controllers/activity.admin.controller';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';

// The same pipes the controller's @PaginationQueryFilterInEnum params run.
const pipe = (field: string, enumType: Record<string, any>) => {
    const Pipe = PaginationFilterInEnumPipe(field, undefined, enumType);
    return new Pipe(
        {} as any,
        new DatabaseService(),
        new HelperArrayService()
    ) as { transform: (value?: string) => Promise<any> };
};
const actionPipe = pipe('action', ENUM_ACTIVITY_ACTION);
const subjectPipe = pipe('subject', ENUM_POLICY_SUBJECT);

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

    const list = async (action?: string, subject?: string) =>
        controller.list(
            { id: 'u1' } as any,
            { _limit: 20, _offset: 0, _order: {} } as any,
            await actionPipe.transform(action),
            await subjectPipe.transform(subject)
        );

    it('filters by comma-separated actions and subjects, dropping unknown values', async () => {
        await list('create,update,bogus', 'CHATBOT,chatbot');

        const find = {
            action: { $in: ['create', 'update'] },
            subject: { $in: ['CHATBOT'] },
        };
        expect(activityService.findAllByUser).toHaveBeenCalledWith(
            'u1',
            find,
            expect.anything()
        );
        expect(activityService.getTotalByUser).toHaveBeenCalledWith('u1', find);
    });

    it('lists every activity when no filter is given', async () => {
        await list();

        expect(activityService.findAllByUser).toHaveBeenCalledWith(
            'u1',
            {},
            expect.anything()
        );
        expect(activityService.getTotalByUser).toHaveBeenCalledWith('u1', {});
    });
});
