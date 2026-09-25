import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';

describe('ReplyGenerationService.run', () => {
    it('no-ops when texts is empty', async () => {
        const svc = new ReplyGenerationService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );
        await expect(
            svc.run({
                conversationId: 'c',
                senderId: 's',
                customerId: 'cu',
                contactPointId: 'cp',
                texts: [],
            })
        ).resolves.toBeUndefined();
    });

    it('captures the current lease epoch before streaming', async () => {
        const lease = {
            current: jest.fn().mockResolvedValue(5),
            isCurrent: jest.fn().mockResolvedValue(true),
        };
        const conversationService = {
            findOneById: jest.fn().mockResolvedValue(null),
        };
        const moduleRef = { get: jest.fn(() => conversationService) };
        const svc = new ReplyGenerationService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            lease as any,
            {} as any,
            moduleRef as any,
            { em: { fork: () => ({}) } } as any,
            {} as any,
            {} as any
        );
        await svc.run({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['hi'],
        });
        expect(lease.current).toHaveBeenCalledWith('c');
    });

    it('sends the burst images to apps/ai and marks images in history', async () => {
        const streamChat = jest.fn().mockRejectedValue(new Error('stop'));
        const conversationService = {
            findOneById: jest
                .fn()
                .mockResolvedValue({ botEnabled: true, account: 'acc-1' }),
        };
        const adapter = { startTyping: jest.fn().mockResolvedValue(undefined) };
        const messageRepository = {
            findRecentByConversation: jest.fn().mockResolvedValue([
                {
                    text: '',
                    attachments: [
                        { type: 'image', url: 'https://cdn/old.jpg' },
                    ],
                    direction: 'INBOUND',
                },
                { text: 'giá bao nhiêu?', direction: 'INBOUND' },
                {
                    id: 'm-3',
                    text: '',
                    attachments: [
                        { type: 'image', url: 'https://cdn/new.jpg' },
                    ],
                    direction: 'INBOUND',
                },
            ]),
            findLatestInbound: jest.fn().mockResolvedValue({ id: 'm-3' }),
        };
        const svc = new ReplyGenerationService(
            {
                findOne: jest.fn().mockResolvedValue({
                    id: 'acc-1',
                    type: 'FACEBOOK_PAGE',
                    chatbot: { id: 'bot-1', workspace: { id: 'ws-1' } },
                }),
            } as any,
            { streamChat } as any,
            messageRepository as any,
            { get: () => adapter } as any,
            { current: jest.fn().mockResolvedValue(1) } as any,
            {} as any,
            { get: jest.fn(() => conversationService) } as any,
            { em: { fork: () => ({}) } } as any,
            { build: jest.fn().mockResolvedValue([]) } as any
        );

        await svc.run({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: [''],
        });

        const params = streamChat.mock.calls[0][0];
        expect(params.attachments).toEqual([
            { attachment_id: 'm-3', preview_url: 'https://cdn/new.jpg' },
        ]);
        expect(params.history).toEqual([
            { role: 'user', content: '[image]' },
            { role: 'user', content: 'giá bao nhiêu?' },
        ]);
    });
});
