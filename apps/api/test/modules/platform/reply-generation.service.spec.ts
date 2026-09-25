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
        const messageMedia = {
            resolve: jest.fn(async (list: { key?: string }[] = []) =>
                list.map(a => ({ type: 'image', url: `https://s3/${a.key}` }))
            ),
        };
        const messageRepository = {
            findRecentByConversation: jest.fn().mockResolvedValue([
                {
                    text: '',
                    attachments: [
                        {
                            type: 'image',
                            key: 'old.jpg',
                            description: 'A yoga flyer, Sat 9am',
                        },
                    ],
                    direction: 'INBOUND',
                },
                { text: 'giá bao nhiêu?', direction: 'INBOUND' },
                {
                    id: 'm-3',
                    text: '',
                    attachments: [{ type: 'image', key: 'new.jpg' }],
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
            { build: jest.fn().mockResolvedValue([]) } as any,
            messageMedia as any
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
            { attachment_id: 'm-3', preview_url: 'https://s3/new.jpg' },
        ]);
        expect(params.history).toEqual([
            { role: 'user', content: '[image: A yoga flyer, Sat 9am]' },
            { role: 'user', content: 'giá bao nhiêu?' },
        ]);
    });

    /** A service over `recent` rows whose stored images resolve to `https://s3/<key>`. */
    function serviceWith(recent: object[]) {
        const streamChat = jest.fn().mockRejectedValue(new Error('stop'));
        const svc = new ReplyGenerationService(
            {
                findOne: jest.fn().mockResolvedValue({
                    id: 'acc-1',
                    type: 'TELEGRAM_BOT',
                    chatbot: { id: 'bot-1', workspace: { id: 'ws-1' } },
                }),
            } as any,
            { streamChat } as any,
            {
                findRecentByConversation: jest.fn().mockResolvedValue(recent),
                findLatestInbound: jest.fn().mockResolvedValue({ id: 'x' }),
            } as any,
            {
                get: () => ({
                    startTyping: jest.fn().mockResolvedValue(undefined),
                }),
            } as any,
            { current: jest.fn().mockResolvedValue(1) } as any,
            {} as any,
            {
                get: jest.fn(() => ({
                    findOneById: jest.fn().mockResolvedValue({
                        botEnabled: true,
                        account: 'acc-1',
                    }),
                })),
            } as any,
            { em: { fork: () => ({}) } } as any,
            { build: jest.fn().mockResolvedValue([]) } as any,
            {
                resolve: jest.fn(async (list: { key?: string }[] = []) =>
                    list.map(a =>
                        a.key
                            ? { type: 'image', url: `https://s3/${a.key}` }
                            : a
                    )
                ),
            } as any
        );
        const run = (texts: string[]) =>
            svc
                .run({
                    conversationId: 'c',
                    senderId: 's',
                    customerId: 'cu',
                    contactPointId: 'cp',
                    texts,
                })
                .then(() => streamChat.mock.calls[0][0]);
        return { run };
    }

    // Telegram images have no link to fall back on, so a failed download
    // left the AI with an empty message and no hint a photo was sent.
    it('tells apps/ai about a burst image it cannot view', async () => {
        const params = await serviceWith([
            {
                id: 'm-1',
                text: '',
                attachments: [{ type: 'image' }],
                direction: 'INBOUND',
            },
        ]).run(['']);

        expect(params.message).toBe(
            '[The user sent an image that could not be viewed.]'
        );
        expect(params.attachments).toEqual([]);
    });

    // A reply to an earlier burst can be saved between the customer's rows;
    // the burst is still the customer's last rows, not the last rows overall.
    it('keeps a burst image when a bot reply lands between the burst rows', async () => {
        const params = await serviceWith([
            { text: 'No. I want another one', direction: 'INBOUND' },
            {
                id: 'm-img',
                text: '',
                attachments: [{ type: 'image', key: 'other.jpg' }],
                direction: 'INBOUND',
            },
            { text: 'The closest match is our shirt.', direction: 'OUTBOUND' },
            { id: 'm-txt', text: 'You have this', direction: 'INBOUND' },
        ]).run(['', 'You have this']);

        expect(params.attachments).toEqual([
            { attachment_id: 'm-img', preview_url: 'https://s3/other.jpg' },
        ]);
        expect(params.history).toEqual([
            { role: 'user', content: 'No. I want another one' },
            { role: 'assistant', content: 'The closest match is our shirt.' },
        ]);
    });

    // The model copied an assistant-turn "[image]" marker into its replies.
    it('leaves the bot\'s own images out of the history text', async () => {
        const params = await serviceWith([
            {
                text: '',
                attachments: [{ type: 'image', url: 'https://kb/shirt.jpg' }],
                direction: 'OUTBOUND',
            },
            { text: 'This is our white linen shirt.', direction: 'OUTBOUND' },
            { id: 'm-1', text: 'do you have it in M?', direction: 'INBOUND' },
        ]).run(['do you have it in M?']);

        expect(params.history).toEqual([
            { role: 'assistant', content: 'This is our white linen shirt.' },
        ]);
    });
});
