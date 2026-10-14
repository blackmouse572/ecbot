import { MessageAttachmentsType } from '../../../src/modules/conversation/repository/types/message-attachments.type';
import {
    botMedia,
    forTurn,
    historyNote,
    parseAttachments,
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
                { type: 'file', url: 'https://kb/m.pdf', name: 'Menu' },
                { type: 'video', url: 42 },
                { url: 'https://no-type' },
                'junk',
                null,
            ])
        ).toEqual([
            { type: 'image', key: 'conversations/c/a.jpg' },
            { type: 'image', url: 'https://kb/s.jpg', description: 'A shirt' },
            { type: 'file', url: 'https://kb/m.pdf', name: 'Menu' },
            { type: 'video' },
        ]);
        expect(parseAttachments(null)).toEqual([]);
        expect(parseAttachments({ type: 'image' })).toEqual([]);
    });

    it('notes images in history with what the AI saw in them', () => {
        expect(
            historyNote([{ type: 'image', description: 'A red dress' }])
        ).toBe('[image: A red dress]');
        expect(historyNote([{ type: 'image' }])).toBe('[image]');
        expect(historyNote([{ type: 'video' }])).toBe('');
        expect(historyNote([])).toBe('');
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
        expect(botMedia({ url: 'https://kb/s.jpg' })).toEqual({
            type: 'image',
            url: 'https://kb/s.jpg',
        });
        expect(
            botMedia({ url: 'https://kb/s.png', mime: 'image/png' })
        ).toEqual({ type: 'image', url: 'https://kb/s.png' });
    });

    it('builds the attachment of a PDF the bot sent, with its name', () => {
        expect(
            botMedia({
                url: 'https://kb/menu.pdf',
                mime: 'application/pdf',
                filename: 'Thực đơn',
            })
        ).toEqual({
            type: 'file',
            url: 'https://kb/menu.pdf',
            name: 'Thực đơn',
        });
    });

    it('notes files in history by name', () => {
        expect(historyNote([{ type: 'file', name: 'Thực đơn' }])).toBe(
            '[file: Thực đơn]'
        );
        expect(historyNote([{ type: 'file' }])).toBe('[file]');
        expect(
            historyNote([{ type: 'image' }, { type: 'file', name: 'a.pdf' }])
        ).toBe('[image] [file: a.pdf]');
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
