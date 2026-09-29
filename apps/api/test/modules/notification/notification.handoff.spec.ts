import en from '@app/languages/en/notification.json';
import vi from '@app/languages/vi/notification.json';
import { NotificationService } from '@app/modules/notification/services/notification.service';

describe('NotificationService.createHandoff', () => {
    const create = jest.fn(async (data: unknown) => data);
    // Echo the key and properties so the test sees which strings were picked.
    const messageService = {
        setMessage: jest.fn(
            (key: string, options?: { properties?: Record<string, string> }) =>
                options?.properties
                    ? `${key}(${Object.values(options.properties).join(',')})`
                    : key
        ),
    };
    const service = new NotificationService(
        { create } as any,
        {} as any,
        messageService as any
    );

    beforeEach(() => create.mockClear());

    it('writes a translated title and a readable reason, not the raw reason code', async () => {
        await service.createHandoff('user-1', {
            conversationId: 'conv-1',
            workspaceId: 'ws-1',
            reason: 'keyword_trigger',
        });

        expect(create.mock.calls[0][0]).toMatchObject({
            title: 'notification.handoff.title',
            message:
                'notification.handoff.message(notification.handoff.reason.keyword_trigger)',
            recipient: 'user-1',
            metadata: {
                actionUrl: '/conversations/conv-1',
                actionText: 'notification.handoff.actionText',
            },
        });
    });

    it('uses a generic reason for a reason it does not know (e.g. a guardrail name)', async () => {
        await service.createHandoff('user-1', {
            conversationId: 'conv-1',
            workspaceId: 'ws-1',
            reason: 'pii_detected',
        });

        expect(create.mock.calls[0][0]).toMatchObject({
            message:
                'notification.handoff.message(notification.handoff.reason.other)',
        });
    });

    it.each([
        ['en', en],
        ['vi', vi],
    ])('has every handoff string in %s', (_lang, messages) => {
        const handoff = (messages as any).handoff;
        expect(handoff.title).toBeTruthy();
        expect(handoff.message).toContain('{reason}');
        expect(handoff.actionText).toBeTruthy();
        for (const reason of [
            'keyword_trigger',
            'fallback_threshold',
            'tag_trigger',
            'other',
        ]) {
            expect(handoff.reason[reason]).toBeTruthy();
        }
    });
});
