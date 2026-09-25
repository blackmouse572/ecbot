import { MESSAGE_HISTORY_WINDOW } from '@app/modules/platform/constants/message-debounce.constant';
import { TurnContextService } from '@app/modules/platform/services/turn-context.service';

/** A Turn context over `rows` (oldest first); stored image keys sign to
 *  `https://s3/<key>`. */
function contextOver(rows: object[]) {
    const findRecentByConversation = jest.fn().mockResolvedValue(rows);
    const service = new TurnContextService(
        { findRecentByConversation } as any,
        {
            resolve: jest.fn(
                async (list: { type: string; key?: string }[] = []) =>
                    list.map(a =>
                        a.key ? { type: a.type, url: `https://s3/${a.key}` } : a
                    )
            ),
        } as any
    );
    return { service, findRecentByConversation };
}

describe('TurnContextService', () => {
    it('reads the history window plus the burst', async () => {
        const { service, findRecentByConversation } = contextOver([]);
        await service.build('c', ['a', 'b']);
        expect(findRecentByConversation).toHaveBeenCalledWith(
            'c',
            MESSAGE_HISTORY_WINDOW + 2
        );
    });

    it('sends the burst images to apps/ai and notes images in history', async () => {
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
            { text: 'giá bao nhiêu?', direction: 'INBOUND' },
            {
                id: 'm-3',
                text: '',
                attachments: [{ type: 'image', key: 'new.jpg' }],
                direction: 'INBOUND',
            },
        ]);

        const context = await service.build('c', ['']);

        expect(context.attachments).toEqual([
            { attachment_id: 'm-3', preview_url: 'https://s3/new.jpg' },
        ]);
        expect(context.history).toEqual([
            { role: 'user', content: '[image: A yoga flyer, Sat 9am]' },
            { role: 'user', content: 'giá bao nhiêu?' },
        ]);
    });

    // Telegram images have no link to fall back on, so a failed download
    // left the AI with an empty message and no hint a photo was sent.
    it('tells apps/ai about a burst image it cannot view', async () => {
        const { service } = contextOver([
            {
                id: 'm-1',
                text: '',
                attachments: [{ type: 'image' }],
                direction: 'INBOUND',
            },
        ]);

        const context = await service.build('c', ['']);

        expect(context.message).toBe(
            '[The user sent an image that could not be viewed.]'
        );
        expect(context.attachments).toEqual([]);
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

        const context = await service.build('c', ['', 'You have this']);

        expect(context.message).toBe('\nYou have this');
        expect(context.attachments).toEqual([
            { attachment_id: 'm-img', preview_url: 'https://s3/other.jpg' },
        ]);
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

        const context = await service.build('c', ['do you have it in M?']);

        expect(context.history).toEqual([
            { role: 'assistant', content: 'This is our white linen shirt.' },
        ]);
    });

    // A follow-up has no burst of its own: every row is history, including
    // what the customer showed.
    it('remembers customer images when there is no burst', async () => {
        const { service } = contextOver([
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

        const context = await service.build('c', []);

        expect(context.history).toEqual([
            { role: 'user', content: 'còn hàng không? [image: A white shirt]' },
            { role: 'assistant', content: 'Dạ còn ạ' },
        ]);
        expect(context.message).toBe('');
        expect(context.attachments).toEqual([]);
    });
});
