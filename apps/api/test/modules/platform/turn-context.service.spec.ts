import { MESSAGE_HISTORY_WINDOW } from '@app/modules/platform/constants/message-debounce.constant';
import { TurnContextService } from '@app/modules/platform/services/turn-context.service';

const UNVIEWABLE = '[The user sent an image that could not be viewed.]';
const USAGE = { inputTokens: 900, outputTokens: 60, totalTokens: 960 };

/**
 * A Turn context over `rows` (oldest first). Stored image keys sign to
 * `https://s3/<key>`; apps/ai describes each image as `seen <url>` unless
 * `describeImages` is replaced.
 */
function contextOver(rows: object[], describeImages?: jest.Mock) {
    const findRecentByConversation = jest.fn().mockResolvedValue(rows);
    const updateAttachments = jest.fn().mockResolvedValue(undefined);
    const ai = {
        describeImages:
            describeImages ??
            jest.fn(
                async ({
                    images,
                }: {
                    images: { id: string; url: string }[];
                }) => ({
                    images: images.map(i => ({
                        id: i.id,
                        description: `seen ${i.url}`,
                    })),
                    usage: USAGE,
                })
            ),
    };
    const service = new TurnContextService(
        { findRecentByConversation, updateAttachments } as any,
        {
            resolve: jest.fn(
                async (list: { type: string; key?: string }[] = []) =>
                    list.map(a =>
                        a.key ? { type: a.type, url: `https://s3/${a.key}` } : a
                    )
            ),
        } as any,
        ai as any
    );
    return { service, findRecentByConversation, updateAttachments, ai };
}

describe('TurnContextService', () => {
    it('reads the history window plus the burst', async () => {
        const { service, findRecentByConversation } = contextOver([]);
        await service.build('c', ['a', 'b'], 'bot');
        expect(findRecentByConversation).toHaveBeenCalledWith(
            'c',
            MESSAGE_HISTORY_WINDOW + 2
        );
    });

    it('describes the burst images once, keeps each description, and sends them as text', async () => {
        const { service, ai, updateAttachments } = contextOver([
            {
                id: 'm-1',
                text: 'do you have these?',
                attachments: [
                    { type: 'image', key: 'a.jpg' },
                    { type: 'image', key: 'b.jpg' },
                ],
                direction: 'INBOUND',
            },
        ]);

        const context = await service.build('c', ['do you have these?'], 'bot');

        expect(ai.describeImages).toHaveBeenCalledTimes(1);
        expect(ai.describeImages).toHaveBeenCalledWith({
            chatbot_id: 'bot',
            images: [
                { id: 'm-1:0', url: 'https://s3/a.jpg' },
                { id: 'm-1:1', url: 'https://s3/b.jpg' },
            ],
        });
        expect(updateAttachments).toHaveBeenCalledWith('m-1', [
            {
                type: 'image',
                key: 'a.jpg',
                description: 'seen https://s3/a.jpg',
            },
            {
                type: 'image',
                key: 'b.jpg',
                description: 'seen https://s3/b.jpg',
            },
        ]);
        expect(context.message).toBe(
            'do you have these?\n' +
                '[Image description: seen https://s3/a.jpg]\n' +
                '[Image description: seen https://s3/b.jpg]'
        );
        expect(context.usage).toEqual(USAGE);
    });

    it('reuses a description it already kept', async () => {
        const { service, ai } = contextOver([
            {
                id: 'm-1',
                text: '',
                attachments: [
                    { type: 'image', key: 'a.jpg', description: 'A shirt' },
                ],
                direction: 'INBOUND',
            },
        ]);

        const context = await service.build('c', [''], 'bot');

        expect(ai.describeImages).not.toHaveBeenCalled();
        expect(context.message).toBe('[Image description: A shirt]');
        expect(context.usage).toBeUndefined();
    });

    it('says an image could not be viewed when it has no url or no description', async () => {
        const describeImages = jest.fn(async ({ images }: any) => ({
            images: images.map((i: any) => ({ id: i.id, description: null })),
        }));
        const { service, updateAttachments } = contextOver(
            [
                {
                    id: 'm-1',
                    text: '',
                    // A Telegram photo whose download failed, and one apps/ai
                    // could not describe.
                    attachments: [
                        { type: 'image' },
                        { type: 'image', key: 'b.jpg' },
                    ],
                    direction: 'INBOUND',
                },
            ],
            describeImages
        );

        const context = await service.build('c', [''], 'bot');

        expect(context.message).toBe(`${UNVIEWABLE}\n${UNVIEWABLE}`);
        expect(updateAttachments).not.toHaveBeenCalled();
    });

    it('treats a failed describe call as images it could not view', async () => {
        const { service } = contextOver(
            [
                {
                    id: 'm-1',
                    text: 'this?',
                    attachments: [{ type: 'image', key: 'a.jpg' }],
                    direction: 'INBOUND',
                },
            ],
            jest.fn().mockRejectedValue(new Error('apps/ai down'))
        );

        const context = await service.build('c', ['this?'], 'bot');

        expect(context.message).toBe(`this?\n${UNVIEWABLE}`);
    });

    it('notes images in history with what the AI saw in them', async () => {
        const { service } = contextOver([
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
            { id: 'm-2', text: 'giá bao nhiêu?', direction: 'INBOUND' },
        ]);

        const context = await service.build('c', ['giá bao nhiêu?'], 'bot');

        expect(context.history).toEqual([
            { role: 'user', content: '[image: A yoga flyer, Sat 9am]' },
        ]);
    });

    // A reply to an earlier burst can be saved between the customer's rows;
    // the burst is still the customer's last rows, not the last rows overall.
    it('keeps a burst image when a bot reply lands between the burst rows', async () => {
        const { service } = contextOver([
            { text: 'No. I want another one', direction: 'INBOUND' },
            {
                id: 'm-img',
                text: '',
                attachments: [{ type: 'image', key: 'other.jpg' }],
                direction: 'INBOUND',
            },
            { text: 'The closest match is our shirt.', direction: 'OUTBOUND' },
            { id: 'm-txt', text: 'You have this', direction: 'INBOUND' },
        ]);

        const context = await service.build('c', ['', 'You have this'], 'bot');

        expect(context.message).toBe(
            '\nYou have this\n[Image description: seen https://s3/other.jpg]'
        );
        expect(context.history).toEqual([
            { role: 'user', content: 'No. I want another one' },
            { role: 'assistant', content: 'The closest match is our shirt.' },
        ]);
    });

    // The model copied an assistant-turn "[image]" marker into its replies.
    it("leaves the bot's own images out of the history text", async () => {
        const { service } = contextOver([
            {
                text: '',
                attachments: [{ type: 'image', url: 'https://kb/shirt.jpg' }],
                direction: 'OUTBOUND',
            },
            { text: 'This is our white linen shirt.', direction: 'OUTBOUND' },
            { id: 'm-1', text: 'do you have it in M?', direction: 'INBOUND' },
        ]);

        const context = await service.build(
            'c',
            ['do you have it in M?'],
            'bot'
        );

        expect(context.history).toEqual([
            { role: 'assistant', content: 'This is our white linen shirt.' },
        ]);
    });

    // A follow-up has no burst of its own: every row is history, including
    // what the customer showed, and nothing is described.
    it('remembers customer images when there is no burst', async () => {
        const { service, ai } = contextOver([
            {
                text: 'còn hàng không?',
                attachments: [
                    {
                        type: 'image',
                        key: 'k.jpg',
                        description: 'A white shirt',
                    },
                ],
                direction: 'INBOUND',
            },
            { text: 'Dạ còn ạ', direction: 'OUTBOUND' },
        ]);

        const context = await service.build('c', [], 'bot');

        expect(context.history).toEqual([
            { role: 'user', content: 'còn hàng không? [image: A white shirt]' },
            { role: 'assistant', content: 'Dạ còn ạ' },
        ]);
        expect(context.message).toBe('');
        expect(ai.describeImages).not.toHaveBeenCalled();
    });
});
