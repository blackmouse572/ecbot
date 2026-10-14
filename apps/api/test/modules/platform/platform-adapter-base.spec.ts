// apps/api/test/modules/platform/platform-adapter-base.spec.ts
import { PlatformAdapter } from '../../../src/modules/platform/adapters/platform-adapter.base';
import {
    AdapterCapabilities,
    MediaContent,
    OutboundMessage,
    text,
} from '../../../src/modules/platform/interfaces/message-model';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';

class TestAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE;
    capabilities: AdapterCapabilities;
    readonly oauth: any = {};
    sent: OutboundMessage[] = [];
    edited = 0;
    constructor(caps: Partial<AdapterCapabilities>) {
        super();
        this.capabilities = {
            cards: false,
            buttons: false,
            quickReplies: false,
            media: false,
            editMessage: false,
            deleteMessage: false,
            reactions: { inbound: false, outbound: false },
            typing: false,
            markRead: false,
            ...caps,
        };
    }
    verifyChallenge() {
        return null;
    }
    verifySignature() {
        return true;
    }
    parse() {
        return [];
    }
    async fetchSenderProfile(_a: any, id: string) {
        return { id };
    }
    protected async doSend(_a: any, _s: string, msg: OutboundMessage) {
        this.sent.push(msg);
        return { externalId: 'x1' };
    }
    protected async doEdit() {
        this.edited++;
    }
    // expose degrade for assertion
    pubDegrade(m: OutboundMessage) {
        return this.degrade(m);
    }
    // expose truncateGraphemes for assertion
    pubTruncate(text: string, limit: number, suffix?: string) {
        return this.truncateGraphemes(text, limit, suffix);
    }
}

const card = (): OutboundMessage => ({
    content: {
        kind: 'card',
        card: {
            title: 'T',
            body: 'B',
            buttons: [{ kind: 'postback', id: 'a', label: 'Yes' }],
        },
    },
    quickReplies: [{ id: 'q', label: 'Quick' }],
    fallbackText: 'T — B',
});

describe('PlatformAdapter.degrade', () => {
    it('keeps a card when cards+buttons supported', () => {
        const a = new TestAdapter({
            cards: true,
            buttons: true,
            quickReplies: true,
        });
        expect(a.pubDegrade(card()).content.kind).toBe('card');
    });

    it('degrades card to fallbackText when cards unsupported', () => {
        const a = new TestAdapter({ cards: false });
        const out = a.pubDegrade(card());
        expect(out.content).toEqual({ kind: 'text', text: 'T — B' });
    });

    it('strips card buttons when buttons unsupported but cards supported', () => {
        const a = new TestAdapter({ cards: true, buttons: false });
        const out = a.pubDegrade(card());
        expect(out.content.kind).toBe('card');
        expect((out.content as any).card.buttons).toBeUndefined();
    });

    it('folds quickReplies into text when unsupported', () => {
        const a = new TestAdapter({ quickReplies: false });
        const out = a.pubDegrade(text('pick'));
        // quickReplies added then degraded
        const msg: OutboundMessage = {
            ...text('pick'),
            quickReplies: [{ id: 'q', label: 'Q1' }],
        };
        const d = a.pubDegrade(msg);
        expect((d.content as any).text).toContain('Q1');
        expect(d.quickReplies).toBeUndefined();
    });
});

const MB = 1024 * 1024;
const LIMITS: AdapterCapabilities['mediaLimits'] = {
    image: { mimes: ['image/jpeg', 'image/png'], maxBytes: MB },
    file: { mimes: ['application/pdf'], maxBytes: 5 * MB },
};
const media = (content: Partial<MediaContent>): OutboundMessage => ({
    content: {
        kind: 'media',
        url: 'https://cdn/a.png',
        mediaType: 'image',
        ...content,
    },
    fallbackText: 'https://cdn/a.png',
});

describe('PlatformAdapter.degrade media limits', () => {
    const a = new TestAdapter({ media: true, mediaLimits: LIMITS });

    it('keeps media that fits the limit for its kind', () => {
        const msg = media({ mime: 'image/png', size: 500_000 });
        expect(a.pubDegrade(msg).content).toEqual(msg.content);
    });

    it('swaps in the first alternative that fits', () => {
        const out = a.pubDegrade(
            media({
                url: 'https://cdn/a.webp',
                mime: 'image/webp',
                size: 3 * MB,
                alternatives: [
                    {
                        url: 'https://cdn/a-compact.jpg',
                        mime: 'image/jpeg',
                        size: 400_000,
                    },
                ],
            })
        );
        expect(out.content).toEqual({
            kind: 'media',
            url: 'https://cdn/a-compact.jpg',
            mediaType: 'image',
            mime: 'image/jpeg',
            size: 400_000,
        });
    });

    it('sends the link as text when nothing fits', () => {
        const out = a.pubDegrade(
            media({
                url: 'https://cdn/menu.pdf',
                mediaType: 'file',
                mime: 'application/pdf',
                size: 8 * MB,
                filename: 'Thực đơn',
            })
        );
        expect(out.content).toEqual({
            kind: 'text',
            text: 'Thực đơn\nhttps://cdn/menu.pdf',
        });
    });

    it('sends a too-large image with no alternative as its bare link', () => {
        const out = a.pubDegrade(media({ mime: 'image/png', size: 2 * MB }));
        expect(out.content).toEqual({
            kind: 'text',
            text: 'https://cdn/a.png',
        });
    });

    // A `send_image` picture comes with no mime or size: what can't be
    // checked is assumed (mime from the URL, size as large as the 5MB images
    // we accept), so a strict channel gets the link instead of a failed send.
    it('assumes an unknown size is 5MB', () => {
        const strict = a.pubDegrade(media({ mime: 'image/jpeg' }));
        expect(strict.content).toEqual({
            kind: 'text',
            text: 'https://cdn/a.png',
        });
        const loose = new TestAdapter({
            media: true,
            mediaLimits: {
                image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 5 * MB },
            },
        });
        const msg = media({ mime: 'image/jpeg' });
        expect(loose.pubDegrade(msg).content).toEqual(msg.content);
    });

    it('reads an unknown mime from the URL extension', () => {
        const loose = new TestAdapter({
            media: true,
            mediaLimits: {
                image: { mimes: ['image/jpeg', 'image/png'], maxBytes: 5 * MB },
            },
        });
        const png = media({ url: 'https://cdn/a.PNG?v=2' });
        expect(loose.pubDegrade(png).content).toEqual(png.content);
        const webp = loose.pubDegrade(media({ url: 'https://cdn/a.webp' }));
        expect(webp.content).toEqual({
            kind: 'text',
            text: 'https://cdn/a.webp',
        });
    });

    it('applies no limit when the channel declares none', () => {
        const open = new TestAdapter({ media: true });
        const msg = media({ mime: 'image/webp', size: 30 * MB });
        expect(open.pubDegrade(msg).content).toEqual(msg.content);
    });
});

describe('PlatformAdapter capability guards', () => {
    it('editMessage is a no-op when unsupported', async () => {
        const a = new TestAdapter({ editMessage: false });
        await a.editMessage({} as any, 's', 'ext', text('x'));
        expect(a.edited).toBe(0);
    });

    it('editMessage delegates to doEdit when supported', async () => {
        const a = new TestAdapter({ editMessage: true });
        await a.editMessage({} as any, 's', 'ext', text('x'));
        expect(a.edited).toBe(1);
    });
});

describe('PlatformAdapter.truncateGraphemes', () => {
    const a = new TestAdapter({});

    it('returns the input unchanged when under the limit', () => {
        expect(a.pubTruncate('hello', 2000)).toBe('hello');
    });

    it('truncates a long run of astral emoji without lone surrogates / U+FFFD', () => {
        const input = '😀'.repeat(3000);
        const result = a.pubTruncate(input, 2000);

        expect(result).not.toMatch(/�/);
        expect(result.endsWith('...')).toBe(true);

        const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
        const graphemes = [...seg.segment(result)].map(g => g.segment);
        expect(graphemes.length).toBeLessThanOrEqual(2000);

        const body = graphemes.slice(0, -3);
        expect(body.every(g => g === '😀')).toBe(true);
    });

    it('does not split a ZWJ emoji sequence at the truncation boundary', () => {
        const family = '👨‍👩‍👧'; // man + ZWJ + woman + ZWJ + girl — one grapheme cluster
        const input = family.repeat(5);
        const result = a.pubTruncate(input, 3, '');

        expect(result).not.toMatch(/�/);
        const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
        const graphemes = [...seg.segment(result)].map(g => g.segment);
        expect(graphemes).toEqual([family, family, family]);
    });
});
