import { MessageAttachmentsType } from '../../../src/modules/conversation/repository/types/message-attachments.type';
import {
    botImage,
    forTurn,
    historyNote,
    parseAttachments,
    withDescription,
} from '../../../src/modules/conversation/utils/message-attachment';

describe('message attachment', () => {
    it('parses stored rows, dropping junk and unknown fields', () => {
        expect(
            parseAttachments([
                { type: 'image', key: 'conversations/c/a.jpg', raw: { x: 1 } },
                { type: 'image', url: 'https://kb/s.jpg', description: 'A shirt' },
                { type: 'video', url: 42 },
                { url: 'https://no-type' },
                'junk',
                null,
            ])
        ).toEqual([
            { type: 'image', key: 'conversations/c/a.jpg' },
            { type: 'image', url: 'https://kb/s.jpg', description: 'A shirt' },
            { type: 'video' },
        ]);
        expect(parseAttachments(null)).toEqual([]);
        expect(parseAttachments({ type: 'image' })).toEqual([]);
    });

    it('notes images in history with what the AI saw in them', () => {
        expect(historyNote([{ type: 'image', description: 'A red dress' }])).toBe(
            '[image: A red dress]'
        );
        expect(historyNote([{ type: 'image' }])).toBe('[image]');
        expect(historyNote([{ type: 'video' }])).toBe('');
        expect(historyNote([])).toBe('');
    });

    it('describes only the images', () => {
        expect(
            withDescription(
                [{ type: 'image', key: 'k.jpg' }, { type: 'video' }],
                'A shirt'
            )
        ).toEqual([
            { type: 'image', key: 'k.jpg', description: 'A shirt' },
            { type: 'video' },
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
