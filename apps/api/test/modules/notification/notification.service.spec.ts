import en from '@app/languages/en/notification.json';
import vi from '@app/languages/vi/notification.json';
import {
    NotificationPriority,
    NotificationType,
} from '@app/modules/notification/enums/notification.enum';
import { NotificationService } from '@app/modules/notification/services/notification.service';

describe('NotificationService subscription notifications', () => {
    // Echo the key so the assertions read which string was picked.
    const messageService = { setMessage: jest.fn((key: string) => key) };
    const service = new NotificationService(
        {} as any,
        {} as any,
        messageService as any
    );
    const create = jest.spyOn(service, 'create').mockResolvedValue({} as any);

    beforeEach(() => {
        create.mockClear();
        messageService.setMessage.mockClear();
    });

    describe('createSubscriptionPlanChanged', () => {
        it('notifies the owner of the new plan and links to usage', async () => {
            await service.createSubscriptionPlanChanged('user-1', 'ws-1', {
                workspaceName: 'Acme',
                fromPlan: 'free',
                toPlan: 'pro',
                note: 'Upgrade confirmed',
            });

            const dto = create.mock.calls[0][0];

            expect(dto).toMatchObject({
                title: 'notification.subscriptionPlanChanged.title',
                type: NotificationType.SUCCESS,
                priority: NotificationPriority.MEDIUM,
                recipient: 'user-1',
                workspace: 'ws-1',
                metadata: {
                    actionUrl: '/usage',
                    actionText:
                        'notification.subscriptionPlanChanged.actionText',
                    data: {
                        fromPlan: 'free',
                        toPlan: 'pro',
                        note: 'Upgrade confirmed',
                    },
                },
            });
            expect(dto.message).toBe(
                'notification.subscriptionPlanChanged.message notification.subscriptionPlanChanged.note'
            );
        });

        it('keeps the plain message when there is no note', async () => {
            await service.createSubscriptionPlanChanged('user-1', 'ws-1', {
                workspaceName: 'Acme',
                fromPlan: 'free',
                toPlan: 'pro',
            });

            const dto = create.mock.calls[0][0];

            expect(dto.message).toBe(
                'notification.subscriptionPlanChanged.message'
            );
            expect(dto.metadata.data.note).toBeUndefined();
        });

        it('announces a scheduled change with the date instead of "now"', async () => {
            await service.createSubscriptionPlanChanged('user-1', 'ws-1', {
                workspaceName: 'Acme',
                fromPlan: 'free',
                toPlan: 'pro',
                scheduledOn: '2026-11-01',
                note: 'Downgrade confirmed',
            });

            const dto = create.mock.calls[0][0];

            expect(dto).toMatchObject({
                title: 'notification.subscriptionPlanChanged.scheduledTitle',
                type: NotificationType.SUCCESS,
                priority: NotificationPriority.MEDIUM,
                recipient: 'user-1',
                workspace: 'ws-1',
            });
            expect(dto.message).toBe(
                'notification.subscriptionPlanChanged.scheduledMessage notification.subscriptionPlanChanged.note'
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.scheduledMessage',
                {
                    properties: {
                        workspaceName: 'Acme',
                        fromPlan: 'free',
                        toPlan: 'pro',
                        scheduledOn: '2026-11-01',
                    },
                }
            );
        });
    });

    describe('createSubscriptionCanceled', () => {
        it('tells the owner when the plan ends and links to usage', async () => {
            await service.createSubscriptionCanceled('user-1', 'ws-1', {
                workspaceName: 'Acme',
                planName: 'pro',
                periodEnd: '2026-11-01',
                reason: 'Payment failed',
            });

            const dto = create.mock.calls[0][0];

            expect(dto).toMatchObject({
                title: 'notification.subscriptionCanceled.title',
                type: NotificationType.SUCCESS,
                priority: NotificationPriority.MEDIUM,
                recipient: 'user-1',
                workspace: 'ws-1',
                metadata: {
                    actionUrl: '/usage',
                    actionText: 'notification.subscriptionCanceled.actionText',
                    data: { planName: 'pro', reason: 'Payment failed' },
                },
            });
            expect(dto.message).toBe(
                'notification.subscriptionCanceled.message notification.subscriptionCanceled.note'
            );
        });

        it('keeps the plain message when there is no reason', async () => {
            await service.createSubscriptionCanceled('user-1', 'ws-1', {
                workspaceName: 'Acme',
                planName: 'pro',
                periodEnd: '2026-11-01',
            });

            const dto = create.mock.calls[0][0];

            expect(dto.message).toBe(
                'notification.subscriptionCanceled.message'
            );
            expect(dto.metadata.data.reason).toBeUndefined();
        });
    });

    describe('createSubscriptionResumed', () => {
        it('tells the owner the plan renews and links to usage', async () => {
            await service.createSubscriptionResumed('user-1', 'ws-1', {
                workspaceName: 'Acme',
                planName: 'pro',
            });

            expect(create.mock.calls[0][0]).toMatchObject({
                title: 'notification.subscriptionResumed.title',
                message: 'notification.subscriptionResumed.message',
                type: NotificationType.SUCCESS,
                priority: NotificationPriority.MEDIUM,
                recipient: 'user-1',
                workspace: 'ws-1',
                metadata: {
                    actionUrl: '/usage',
                    actionText: 'notification.subscriptionResumed.actionText',
                    data: { planName: 'pro' },
                },
            });
        });
    });

    it.each([
        ['en', en],
        ['vi', vi],
    ])('has every subscription string in %s', (_lang, messages) => {
        const {
            subscriptionPlanChanged,
            subscriptionCanceled,
            subscriptionResumed,
        } = messages as any;

        for (const block of [
            subscriptionPlanChanged,
            subscriptionCanceled,
            subscriptionResumed,
        ]) {
            expect(block.title).toBeTruthy();
            expect(block.message).toContain('{workspaceName}');
            expect(block.actionText).toBeTruthy();
        }
        expect(subscriptionPlanChanged.message).toContain('{fromPlan}');
        expect(subscriptionPlanChanged.message).toContain('{toPlan}');
        expect(subscriptionPlanChanged.scheduledTitle).toBeTruthy();
        expect(subscriptionPlanChanged.scheduledMessage).toContain(
            '{workspaceName}'
        );
        expect(subscriptionPlanChanged.scheduledMessage).toContain('{toPlan}');
        expect(subscriptionPlanChanged.scheduledMessage).toContain(
            '{scheduledOn}'
        );
        expect(subscriptionPlanChanged.note).toContain('{note}');
        expect(subscriptionCanceled.message).toContain('{planName}');
        expect(subscriptionCanceled.message).toContain('{periodEnd}');
        expect(subscriptionCanceled.note).toContain('{note}');
        expect(subscriptionResumed.message).toContain('{planName}');
    });
});
