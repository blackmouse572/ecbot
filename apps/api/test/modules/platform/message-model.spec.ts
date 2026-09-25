import {
    text,
    encodeActionPayload,
    decodeActionPayload,
    imageUrls,
    replyMessages,
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
    it('imageUrls() keeps only image attachments that carry a url', () => {
        expect(
            imageUrls([
                { type: 'image', url: 'https://cdn/a.jpg' },
                { type: 'image' },
                { type: 'video', url: 'https://cdn/v.mp4' },
                'junk',
            ])
        ).toEqual(['https://cdn/a.jpg']);
        expect(imageUrls(undefined)).toEqual([]);
    });

    it('replyMessages() turns markdown images into media messages', () => {
        expect(
            replyMessages(
                'Mẫu này giá 350k nhé\n![Áo sơ mi trắng](https://cdn/shirt.jpg)'
            )
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

    it('replyMessages() does not read an image whose alt text spans lines', () => {
        // apps/ai screens only single-line alt text, so a multi-line one was
        // never checked against the knowledge base and must stay text.
        const segment = '![a\nb](https://evil.example/x.png)';
        expect(replyMessages(segment)).toEqual([text(segment)]);
    });

    it('replyMessages() does not read a url holding a character apps/ai treats as whitespace', () => {
        // Python's \s also covers \x1c-\x1f and \x85, so apps/ai never
        // screened these urls against the knowledge base.
        for (const c of ['\x85', '\x1c', '\x1f']) {
            const segment = `![p](https://evil.example/a${c}b)`;
            expect(replyMessages(segment)).toEqual([text(segment)]);
        }
    });

    it('replyMessages() leaves plain text as one text message', () => {
        expect(replyMessages('hello')).toEqual([text('hello')]);
    });
});
