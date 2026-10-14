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
                media: [{ url: 'https://cdn/shirt.jpg' }],
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

    it('segmentMessages() leaves markdown in the text alone', () => {
        // apps/ai already turned allowed images into file parts; anything
        // left in the text is plain text.
        const segment = { text: '![x](https://evil/x.png)', media: [] };
        expect(segmentMessages(segment)).toEqual([text(segment.text)]);
    });
});

describe('message-model media', () => {
    it('segmentMessages() sends a PDF as a file named by its title', () => {
        expect(
            segmentMessages({
                text: '',
                media: [
                    {
                        url: 'https://cdn/menu.pdf',
                        mime: 'application/pdf',
                        filename: 'Thực đơn',
                        size: 2048,
                    },
                ],
            })
        ).toEqual([
            {
                content: {
                    kind: 'media',
                    url: 'https://cdn/menu.pdf',
                    mediaType: 'file',
                    mime: 'application/pdf',
                    filename: 'Thực đơn',
                    size: 2048,
                },
                fallbackText: 'Thực đơn\nhttps://cdn/menu.pdf',
            },
        ]);
    });

    it('segmentMessages() offers the compact copy as an alternative', () => {
        const [msg] = segmentMessages({
            text: '',
            media: [
                {
                    url: 'https://cdn/a.webp',
                    mime: 'image/webp',
                    size: 3_000_000,
                    compact: {
                        url: 'https://cdn/a-compact.jpg',
                        mime: 'image/jpeg',
                        size: 400_000,
                    },
                },
            ],
        });
        expect(msg.content).toMatchObject({
            kind: 'media',
            mediaType: 'image',
            mime: 'image/webp',
            alternatives: [
                {
                    url: 'https://cdn/a-compact.jpg',
                    mime: 'image/jpeg',
                    size: 400_000,
                },
            ],
        });
    });
});
