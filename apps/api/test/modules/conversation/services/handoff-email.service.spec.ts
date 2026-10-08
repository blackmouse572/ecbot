import { HandoffEmailService } from '@app/modules/conversation/services/handoff-email.service';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';

describe('HandoffEmailService.send', () => {
    const enqueue = jest.fn();
    const findConversation = jest.fn();
    const findWorkspace = jest.fn();
    const findMembers = jest.fn();
    const service = new HandoffEmailService(
        { findOneById: findConversation } as any,
        { findActiveByWorkspace: findMembers } as any,
        { findOneById: findWorkspace } as any,
        { enqueue } as any
    );
    const owner = { id: 'owner', email: 'owner@b.com', name: 'Owner' };

    beforeEach(() => {
        jest.clearAllMocks();
        enqueue.mockResolvedValue(undefined);
        findConversation.mockResolvedValue({
            id: 'c-1',
            chatbot: { name: 'Linh' },
        });
        findWorkspace.mockResolvedValue({
            id: 'ws-1',
            name: 'Kunmart',
            slug: 'kunmart',
            owner,
        });
        findMembers.mockResolvedValue([
            {
                user: { id: 'agent', email: 'agent@b.com', name: 'Agent' },
                role: {
                    permissions: [
                        { subject: ENUM_POLICY_SUBJECT.CONVERSATION },
                    ],
                },
            },
            {
                user: { id: 'writer', email: 'writer@b.com', name: 'Writer' },
                role: {
                    permissions: [{ subject: ENUM_POLICY_SUBJECT.CHATBOT }],
                },
            },
        ]);
    });

    it('emails the owner and the members who can see conversations', async () => {
        await service.send('c-1', 'ws-1', 'keyword_trigger', 'vi');

        expect(enqueue.mock.calls.map(c => c[2].send.email)).toEqual([
            'owner@b.com',
            'agent@b.com',
        ]);
        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.HANDOFF,
            {
                send: { email: 'owner@b.com', name: 'Owner' },
                data: {
                    chatbotName: 'Linh',
                    workspaceName: 'Kunmart',
                    reason: 'keyword_trigger',
                    conversationUrl: '/kunmart/conversations/c-1',
                    language: 'vi',
                },
            },
            { taskName: expect.stringMatching(/^HANDOFF-c-1-owner-/) }
        );
    });

    it('never throws: a failed email must not undo the handoff', async () => {
        enqueue.mockRejectedValue(new Error('queue down'));
        findMembers.mockRejectedValueOnce(new Error('db down'));

        await expect(
            service.send('c-1', 'ws-1', 'keyword_trigger')
        ).resolves.toBeUndefined();
    });
});
