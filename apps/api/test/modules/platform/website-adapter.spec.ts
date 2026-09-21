import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { WebsitePlatformAdapter } from '../../../src/modules/platform/adapters/website/website.platform-adapter';

const account = {
    id: 'acc-1',
    externalId: 'widget-key-1',
    name: 'Shop widget',
    type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
    config: { allowedOrigins: ['https://shop.example.com'] },
} as any;

describe('WebsitePlatformAdapter inbound', () => {
    it('never accepts the generic /public/webhooks/:platform ingress', () => {
        const adapter = new WebsitePlatformAdapter();
        expect(adapter.verifySignature('{}', {})).toBe(false);
    });

    it('has no challenge handshake', () => {
        const adapter = new WebsitePlatformAdapter();
        expect(adapter.verifyChallenge({} as any)).toBeNull();
    });

    it('parses nothing — visitor turns enter through the widget controller', () => {
        const adapter = new WebsitePlatformAdapter();
        expect(adapter.parse('{"anything":true}')).toEqual([]);
    });

    it('reports the visitor id as the sender profile', async () => {
        const adapter = new WebsitePlatformAdapter();
        await expect(
            adapter.fetchSenderProfile(account, 'visitor-7')
        ).resolves.toEqual({ id: 'visitor-7' });
    });
});

describe('WebsitePlatformAdapter.doSend', () => {
    it('returns an id without performing any delivery', async () => {
        const adapter = new WebsitePlatformAdapter();

        const result = await adapter.sendMessage(account, 'visitor-7', {
            content: { kind: 'text', text: 'an operator reply' },
            fallbackText: 'an operator reply',
        });

        expect(result.externalId).toEqual(expect.any(String));
    });

    it('never throws — the message is already persisted before it runs', async () => {
        const adapter = new WebsitePlatformAdapter();

        await expect(
            adapter.sendMessage({} as any, 'visitor-7', {
                content: { kind: 'text', text: 'hi' },
                fallbackText: 'hi',
            })
        ).resolves.toBeDefined();
    });

    it('mints a distinct id per send so poll cursors stay ordered', async () => {
        const adapter = new WebsitePlatformAdapter();
        const msg = {
            content: { kind: 'text' as const, text: 'hi' },
            fallbackText: 'hi',
        };

        const a = await adapter.sendMessage(account, 'v1', msg);
        const b = await adapter.sendMessage(account, 'v1', msg);

        expect(a.externalId).not.toBe(b.externalId);
    });
});

describe('WebsitePlatformAdapter capabilities', () => {
    it('declares rich content because eccho owns the widget UI', () => {
        const adapter = new WebsitePlatformAdapter();
        expect(adapter.capabilities.cards).toBe(true);
        expect(adapter.capabilities.buttons).toBe(true);
        expect(adapter.capabilities.quickReplies).toBe(true);
        expect(adapter.capabilities.media).toBe(true);
    });
});
