import {
    text,
    encodeActionPayload,
    decodeActionPayload,
    segmentMessages,
} from '../../../src/modules/platform/interfaces/message-model';

describe('message-model builders', () => {
    it('text() builds a text OutboundMessage with matching fallback', () => {
        expect(text('hi')).toEqual({
            content: { kind: 'text', text: 'hi' },
            fallbackText: 'hi',
        });
    });

    it('action payload round-trips id + value', () => {
        const p = encodeActionPayload('confirm', 'order-1');
        expect(decodeActionPayload(p)).toEqual({
            id: 'confirm',
            value: 'order-1',
        });
    });

    it('decodeActionPayload tolerates a plain non-JSON payload as the id', () => {
        expect(decodeActionPayload('LEGACY_PAYLOAD')).toEqual({
            id: 'LEGACY_PAYLOAD',
        });
    });
});

describe('message-model images', () => {
    it('segmentMessages() sends the text, then each image', () => {
        expect(
            segmentMessages({
                text: 'Mẫu này giá 350k nhé',
                media: [{ url: 'https://cdn/shirt.jpg', kind: 'image' }],
            })
        ).toEqual([
            text('Mẫu này giá 350k nhé'),
            {
                content: {
                    kind: 'media',
                    url: 'https://cdn/shirt.jpg',
                    mediaType: 'image',
                },
                fallbackText: 'https://cdn/shirt.jpg',
            },
        ]);
    });

    it('segmentMessages() sends a file with its name, and the link as fallback', () => {
        expect(
            segmentMessages({
                text: '',
                media: [
                    {
                        url: 'https://cdn/m.pdf',
                        kind: 'file',
                        name: 'Menu.pdf',
                    },
                ],
            })
        ).toEqual([
            {
                content: {
                    kind: 'media',
                    url: 'https://cdn/m.pdf',
                    mediaType: 'file',
                    name: 'Menu.pdf',
                },
                fallbackText: 'Menu.pdf\nhttps://cdn/m.pdf',
            },
        ]);
    });

    it('segmentMessages() leaves markdown in the text alone', () => {
        // apps/ai already turned allowed images into file parts; anything
        // left in the text is plain text.
        const segment = { text: '![x](https://evil/x.png)', media: [] };
        expect(segmentMessages(segment)).toEqual([text(segment.text)]);
    });
});
