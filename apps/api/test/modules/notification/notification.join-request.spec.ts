import { NotificationService } from '@app/modules/notification/services/notification.service';

describe('NotificationService.createRequestToJoinWorkspace', () => {
    const create = jest.fn(async (data: unknown) => data);
    const messageService = { setMessage: jest.fn((key: string) => key) };
    const service = new NotificationService(
        { create } as any,
        {} as any,
        messageService as any,
        { sendToUser: async () => undefined } as any
    );

    it('links to the join requests page of the workspace slug', async () => {
        await service.createRequestToJoinWorkspace('owner-1', 'user-2', {
            requestId: 'req-1',
            workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' },
            requestorName: 'An',
        });

        expect(create.mock.calls[0][0]).toMatchObject({
            metadata: {
                actionUrl: '/acme/settings/members/join-requests',
            },
        });
    });
});
