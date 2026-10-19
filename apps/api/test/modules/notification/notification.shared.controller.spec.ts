import { NotificationSharedController } from '@app/modules/notification/controllers/notification.shared.controller';
import { NotificationStatus } from '@app/modules/notification/enums/notification.enum';

describe('NotificationSharedController.list', () => {
    const user = { id: 'u-1' } as any;
    const page = {
        _limit: 20,
        _offset: 0,
        _order: { createdAt: 'desc' },
        _search: {},
    } as any;

    const setup = () => {
        const service = {
            findAllByRecipient: jest.fn().mockResolvedValue([]),
            getTotalByUser: jest.fn().mockResolvedValue(45),
        };
        const controller = new NotificationSharedController(
            service as any,
            {
                totalPage: (total: number, limit: number) =>
                    Math.ceil(total / limit),
            } as any,
            {} as any
        );
        return { service, controller };
    };

    it('lists read and unread rows by default, hiding archived and dismissed', async () => {
        const { service, controller } = setup();

        await controller.list(user, page, undefined as any);

        const [recipient, find] = service.findAllByRecipient.mock.calls[0];
        expect(recipient).toBe('u-1');
        expect(find.status).toEqual({
            $nin: [NotificationStatus.ARCHIVED, NotificationStatus.DISMISSED],
        });
    });

    it('honours an explicit status filter', async () => {
        const { service, controller } = setup();

        await controller.list(user, page, NotificationStatus.UNREAD);

        expect(service.findAllByRecipient.mock.calls[0][1].status).toBe(
            NotificationStatus.UNREAD
        );
    });

    it("counts only the caller's notifications for paging", async () => {
        const { service, controller } = setup();

        const result = await controller.list(user, page, undefined as any);

        expect(service.getTotalByUser).toHaveBeenCalledWith(
            'u-1',
            service.findAllByRecipient.mock.calls[0][1]
        );
        expect(result._pagination).toEqual({ total: 45, totalPage: 3 });
    });
});
