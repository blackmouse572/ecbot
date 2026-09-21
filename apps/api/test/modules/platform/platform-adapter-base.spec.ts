// apps/api/test/modules/platform/platform-adapter-base.spec.ts
import { PlatformAdapter } from '../../../src/modules/platform/adapters/platform-adapter.base';
import {
    AdapterCapabilities,
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
