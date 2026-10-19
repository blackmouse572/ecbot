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
        messageService as any,
        { sendToUser: async () => undefined } as any
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
            // The message mock echoes the template key, so the {note} slot is
            // filled with the rendered note call's echo below.
            expect(dto.message).toBe(
                'notification.subscriptionPlanChanged.message'
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.note',
                { properties: { note: 'Upgrade confirmed' } }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.message',
                {
                    properties: {
                        workspaceName: 'Acme',
                        fromPlan: 'free',
                        toPlan: 'pro',
                        note: 'notification.subscriptionPlanChanged.note',
                    },
                }
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
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.message',
                {
                    properties: {
                        workspaceName: 'Acme',
                        fromPlan: 'free',
                        toPlan: 'pro',
                        note: '',
                    },
                }
            );
            expect(messageService.setMessage).not.toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.note',
                expect.anything()
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
                'notification.subscriptionPlanChanged.scheduledMessage'
            );
            // The scheduled template does not mention the old plan and never
            // renders "now", so it is not handed a fromPlan.
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.scheduledMessage',
                {
                    properties: {
                        workspaceName: 'Acme',
                        toPlan: 'pro',
                        scheduledOn: '2026-11-01',
                        note: 'notification.subscriptionPlanChanged.note',
                    },
                }
            );
            expect(messageService.setMessage).not.toHaveBeenCalledWith(
                'notification.subscriptionPlanChanged.message',
                expect.anything()
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
            // The message mock echoes the template key, so the {note} slot is
            // filled with the rendered note call's echo below.
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionCanceled.note',
                { properties: { note: 'Payment failed' } }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionCanceled.message',
                {
                    properties: {
                        workspaceName: 'Acme',
                        planName: 'pro',
                        periodEnd: '2026-11-01',
                        note: 'notification.subscriptionCanceled.note',
                    },
                }
            );
            expect(dto.message).toBe(
                'notification.subscriptionCanceled.message'
            );
        });

        it('keeps the plain message when there is no reason', async () => {
            await service.createSubscriptionCanceled('user-1', 'ws-1', {
                workspaceName: 'Acme',
                planName: 'pro',
                periodEnd: '2026-11-01',
            });

            const dto = create.mock.calls[0][0];

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.subscriptionCanceled.message',
                {
                    properties: {
                        workspaceName: 'Acme',
                        planName: 'pro',
                        periodEnd: '2026-11-01',
                        note: '',
                    },
                }
            );
            expect(messageService.setMessage).not.toHaveBeenCalledWith(
                'notification.subscriptionCanceled.note',
                expect.anything()
            );
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
        // The narratives carry a {note} slot so editors place the note per
        // language; empty-string interpolation must leave a clean sentence.
        expect(subscriptionPlanChanged.message).toContain('{note}');
        expect(subscriptionPlanChanged.scheduledTitle).toBeTruthy();
        expect(subscriptionPlanChanged.scheduledMessage).toContain(
            '{workspaceName}'
        );
        expect(subscriptionPlanChanged.scheduledMessage).toContain('{toPlan}');
        expect(subscriptionPlanChanged.scheduledMessage).toContain(
            '{scheduledOn}'
        );
        expect(subscriptionPlanChanged.scheduledMessage).toContain('{note}');
        expect(subscriptionPlanChanged.note).toContain('{note}');
        expect(subscriptionPlanChanged.note.endsWith(' {note}')).toBe(true);
        expect(subscriptionCanceled.message).toContain('{planName}');
        expect(subscriptionCanceled.message).toContain('{periodEnd}');
        expect(subscriptionCanceled.message).toContain('{note}');
        expect(subscriptionCanceled.note).toContain('{note}');
        expect(subscriptionCanceled.note.endsWith(' {note}')).toBe(true);
        expect(subscriptionResumed.message).toContain('{planName}');
    });
});
