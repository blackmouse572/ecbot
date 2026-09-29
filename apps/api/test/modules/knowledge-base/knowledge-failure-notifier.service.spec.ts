import { KnowledgeFailureNotifierService } from '@app/modules/knowledge-base/services/knowledge-failure-notifier.service';
import { ENUM_KNOWLEDGE_FAILURE_KIND } from '@app/modules/knowledge-base/constants/knowledge-ingest.constant';
import {
    NotificationPriority,
    NotificationType,
} from '@app/modules/notification/enums/notification.enum';

describe('KnowledgeFailureNotifierService', () => {
    const item = (createdBy?: { id: string }) => ({
        id: 'item-1',
        title: 'Refund policy',
        createdBy,
        knowledgeBase: {
            id: 'kb-1',
            workspace: { id: 'ws-1', slug: 'kunmart' },
        },
    });
    const setup = (
        found: unknown,
        members: { user: { id: string } }[] = []
    ) => {
        const knowledgeItemService = {
            findOneById: jest.fn().mockResolvedValue(found),
        };
        const notificationService = {
            create: jest.fn().mockResolvedValue({}),
        };
        const workspaceMemberRepository = {
            findActiveByWorkspace: jest.fn().mockResolvedValue(members),
        };
        const messageService = {
            setMessage: jest.fn(
                (key: string, opts?: { properties?: Record<string, string> }) =>
                    `${key}${opts?.properties ? JSON.stringify(opts.properties) : ''}`
            ),
        };
        const service = new KnowledgeFailureNotifierService(
            knowledgeItemService as any,
            notificationService as any,
            workspaceMemberRepository as any,
            messageService as any
        );
        return { service, notificationService, workspaceMemberRepository };
    };

    it('notifies the member who added the item, linking to it', async () => {
        const { service, notificationService, workspaceMemberRepository } =
            setup(item({ id: 'user-1' }));

        await service.notifyFailed(
            'item-1',
            ENUM_KNOWLEDGE_FAILURE_KIND.INGEST
        );

        expect(
            workspaceMemberRepository.findActiveByWorkspace
        ).not.toHaveBeenCalled();
        expect(notificationService.create).toHaveBeenCalledTimes(1);
        expect(notificationService.create).toHaveBeenCalledWith({
            title: 'knowledgeItem.notification.ingestFailed.title',
            message:
                'knowledgeItem.notification.ingestFailed.message{"title":"Refund policy"}',
            type: NotificationType.ERROR,
            priority: NotificationPriority.HIGH,
            recipient: 'user-1',
            metadata: {
                actionUrl: '/kunmart/knowledge-base/kb-1/item/item-1',
                actionText: 'knowledgeItem.notification.actionText',
                data: { knowledgeItemId: 'item-1', kind: 'ingest' },
            },
        });
    });

    it('falls back to every active member when the creator is unknown', async () => {
        const { service, notificationService } = setup(item(), [
            { user: { id: 'user-1' } },
            { user: { id: 'user-2' } },
        ]);

        await service.notifyFailed(
            'item-1',
            ENUM_KNOWLEDGE_FAILURE_KIND.LINK_SYNC
        );

        expect(notificationService.create).toHaveBeenCalledTimes(2);
        expect(notificationService.create.mock.calls[0][0].title).toBe(
            'knowledgeItem.notification.linkSyncFailed.title'
        );
    });

    it('does nothing for an item that no longer exists', async () => {
        const { service, notificationService } = setup(null);
        await service.notifyFailed(
            'item-1',
            ENUM_KNOWLEDGE_FAILURE_KIND.INGEST
        );
        expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('never throws, so a notification problem cannot break the task', async () => {
        const { service, notificationService } = setup(item({ id: 'user-1' }));
        notificationService.create.mockRejectedValue(new Error('db down'));
        await expect(
            service.notifyFailed('item-1', ENUM_KNOWLEDGE_FAILURE_KIND.INGEST)
        ).resolves.toBeUndefined();
    });
});
