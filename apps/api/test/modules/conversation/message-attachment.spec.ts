import { MessageAttachmentsType } from '../../../src/modules/conversation/repository/types/message-attachments.type';
import {
    botImage,
    forTurn,
    attachmentNote,
    historyNote,
    parseAttachments,
    replyNote,
    withDescriptions,
} from '../../../src/modules/conversation/utils/message-attachment';

describe('message attachment', () => {
    it('parses stored rows, dropping junk and unknown fields', () => {
        expect(
            parseAttachments([
                { type: 'image', key: 'conversations/c/a.jpg', raw: { x: 1 } },
                {
                    type: 'image',
                    url: 'https://kb/s.jpg',
                    description: 'A shirt',
                },
                { type: 'video', url: 42 },
                { type: 'sticker', key: 'k.webp', emoji: '👍' },
                { url: 'https://no-type' },
                'junk',
                null,
            ])
        ).toEqual([
            { type: 'image', key: 'conversations/c/a.jpg' },
            { type: 'image', url: 'https://kb/s.jpg', description: 'A shirt' },
            { type: 'video' },
            { type: 'sticker', key: 'k.webp', emoji: '👍' },
        ]);
        expect(parseAttachments(null)).toEqual([]);
        expect(parseAttachments({ type: 'image' })).toEqual([]);
    });

    it('notes images in history with what the AI saw in them', () => {
        expect(
            historyNote([{ type: 'image', description: 'A red dress' }])
        ).toBe('[image: A red dress]');
        expect(historyNote([{ type: 'image' }])).toBe('[image]');
        expect(historyNote([])).toBe('');
    });

    it('notes stickers, stories and media the AI cannot open in history', () => {
        expect(
            historyNote([
                { type: 'sticker', description: 'ok, agreed', emoji: '👍' },
                { type: 'video' },
            ])
        ).toBe('[Sticker meaning: ok, agreed] [Video, which you cannot watch]');
        expect(
            historyNote([{ type: 'story', description: 'A red dress' }], {
                kind: 'story',
            })
        ).toBe('[Replying to your story, which shows: A red dress]');
    });

    it('says what a sticker means, else its emoji', () => {
        expect(
            attachmentNote({ type: 'sticker', description: 'confused' })
        ).toBe('[Sticker meaning: confused]');
        expect(attachmentNote({ type: 'sticker', emoji: '😂' })).toBe(
            '[Sticker: 😂]'
        );
        expect(attachmentNote({ type: 'sticker' })).toBe(
            '[Sticker that could not be viewed]'
        );
    });

    it('tells a story reply from a story mention', () => {
        expect(attachmentNote({ type: 'story' }, true)).toBe(
            '[Replying to your story]'
        );
        expect(attachmentNote({ type: 'story', description: 'A cake' })).toBe(
            '[Mentioned you in their story, which shows: A cake]'
        );
    });

    it('notes what a quoted reply answers', () => {
        expect(replyNote({ kind: 'message', text: 'Size M còn không?' })).toBe(
            '[Replying to your message: "Size M còn không?"]'
        );
        expect(
            replyNote({ kind: 'message', text: 'giá?', fromCustomer: true })
        ).toBe('[Replying to their own earlier message: "giá?"]');
        expect(replyNote({ kind: 'message' })).toBe(
            '[Replying to an earlier message]'
        );
        expect(replyNote(undefined)).toBe('');
        // The story's own note says it.
        expect(replyNote({ kind: 'story' })).toBe('');
    });

    it('sets each description on its own attachment', () => {
        expect(
            withDescriptions(
                [
                    { type: 'image', key: 'a.jpg' },
                    { type: 'image', key: 'b.jpg' },
                ],
                [undefined, 'A shirt']
            )
        ).toEqual([
            { type: 'image', key: 'a.jpg' },
            { type: 'image', key: 'b.jpg', description: 'A shirt' },
        ]);
    });

    it('builds the attachment of an image the bot sent', () => {
        expect(botImage('https://kb/s.jpg')).toEqual({
            type: 'image',
            url: 'https://kb/s.jpg',
        });
    });

    it('splits resolved images into urls for the AI and ones it cannot view', () => {
        expect(
            forTurn([
                { type: 'image', url: 'https://s3/a.jpg' },
                { type: 'image' },
                { type: 'video', url: 'https://cdn/v.mp4' },
            ])
        ).toEqual({ urls: ['https://s3/a.jpg'], unviewable: 1 });
    });

    it('parses the jsonb column when rows are read', () => {
        const type = new MessageAttachmentsType();
        expect(
            type.convertToJSValue(
                [{ type: 'image', key: 'k.jpg', raw: 1 }, 'junk'] as any,
                {} as any
            )
        ).toEqual([{ type: 'image', key: 'k.jpg' }]);
    });
});
