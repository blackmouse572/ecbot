import en from '@app/languages/en/notification.json';
import vi from '@app/languages/vi/notification.json';
import { NotificationService } from '@app/modules/notification/services/notification.service';

describe('NotificationService.createHandoff', () => {
    const create = jest.fn(async (data: unknown) => data);
    // Echo the key and properties so the test sees which strings were picked.
    const messageService = {
        setMessage: jest.fn(
            (
                key: string,
                options?: {
                    customLanguage?: string;
                    properties?: Record<string, string>;
                }
            ) =>
                options?.properties
                    ? `${key}(${Object.values(options.properties).join(',')})`
                    : key
        ),
    };
    const service = new NotificationService(
        { create } as any,
        {} as any,
        messageService as any,
        { sendToUser: async () => undefined } as any
    );

    beforeEach(() => create.mockClear());

    it('writes a translated title and a readable reason, not the raw reason code', async () => {
        await service.createHandoff('user-1', {
            conversationId: 'conv-1',
            workspaceId: 'ws-1',
            workspaceSlug: 'acme',
            reason: 'keyword_trigger',
        });

        expect(create.mock.calls[0][0]).toMatchObject({
            title: 'notification.handoff.title',
            message:
                'notification.handoff.message(notification.handoff.reason.keyword_trigger)',
            recipient: 'user-1',
            metadata: {
                actionUrl: '/acme/conversations/conv-1',
                actionText: 'notification.handoff.actionText',
            },
        });
    });

    it('uses a generic reason for a reason it does not know (e.g. a guardrail name)', async () => {
        await service.createHandoff('user-1', {
            conversationId: 'conv-1',
            workspaceId: 'ws-1',
            workspaceSlug: 'acme',
            reason: 'pii_detected',
        });

        expect(create.mock.calls[0][0]).toMatchObject({
            message:
                'notification.handoff.message(notification.handoff.reason.other)',
        });
    });

    it("writes every string in the chatbot's language", async () => {
        messageService.setMessage.mockClear();

        await service.createHandoff('user-1', {
            conversationId: 'conv-1',
            workspaceId: 'ws-1',
            workspaceSlug: 'acme',
            reason: 'keyword_trigger',
            language: 'vi',
        });

        expect(messageService.setMessage.mock.calls).toHaveLength(4);
        for (const [, options] of messageService.setMessage.mock.calls) {
            expect(options).toMatchObject({ customLanguage: 'vi' });
        }
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

    // #288: a notify-only tag, the conversation stays with the assistant.
    describe('createTagNotice', () => {
        it('names the tag and links to the conversation, in the chatbot language', async () => {
            messageService.setMessage.mockClear();

            await service.createTagNotice('user-1', {
                conversationId: 'conv-1',
                workspaceId: 'ws-1',
                workspaceSlug: 'acme',
                tagName: 'Order placed',
                language: 'vi',
            });

            expect(
                (create.mock.calls[0][0] as any).metadata.data.conversationId
            ).toBeUndefined();
            expect(create.mock.calls[0][0]).toMatchObject({
                title: 'notification.tagNotice.title(Order placed)',
                message: 'notification.tagNotice.message',
                recipient: 'user-1',
                metadata: {
                    actionUrl: '/acme/conversations/conv-1',
                    actionText: 'notification.handoff.actionText',
                    // No conversationId: the app reads that as a handoff
                    // (red icon, stays unread until clicked).
                    data: {
                        kind: 'tag_notice',
                        workspaceId: 'ws-1',
                        tagName: 'Order placed',
                    },
                },
            });
            for (const [, options] of messageService.setMessage.mock.calls) {
                expect(options).toMatchObject({ customLanguage: 'vi' });
            }
        });

        it.each([
            ['en', en],
            ['vi', vi],
        ])('has the tag notice strings in %s', (_lang, messages) => {
            const notice = (messages as any).tagNotice;
            expect(notice.title).toContain('{tag}');
            expect(notice.message).toBeTruthy();
        });
    });
});
