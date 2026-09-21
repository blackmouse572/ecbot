import { WidgetSessionService } from '../../../src/modules/platform/services/widget-session.service';

function makeService() {
    const store = new Map<string, unknown>();
    const cache = {
        get: jest.fn(async (k: string) => store.get(k)),
        set: jest.fn(async (k: string, v: unknown) => {
            store.set(k, v);
        }),
    };
    return { service: new WidgetSessionService(cache as any), cache, store };
}

describe('WidgetSessionService.sessionKey', () => {
    it('derives the key server-side rather than trusting the visitor id', () => {
        const { service } = makeService();

        const key = service.sessionKey('acc-1', 'visitor-7');

        expect(key).not.toContain('visitor-7');
        expect(key).toContain('acc-1');
    });

    it('is stable for the same visitor and distinct across visitors', () => {
        const { service } = makeService();

        expect(service.sessionKey('acc-1', 'v1')).toBe(
            service.sessionKey('acc-1', 'v1')
        );
        expect(service.sessionKey('acc-1', 'v1')).not.toBe(
            service.sessionKey('acc-1', 'v2')
        );
    });

    it('separates the same visitor id across different widgets', () => {
        const { service } = makeService();

        expect(service.sessionKey('acc-1', 'v1')).not.toBe(
            service.sessionKey('acc-2', 'v1')
        );
    });
});

describe('WidgetSessionService Turnstile verification', () => {
    it('reports a fresh session as unverified', async () => {
        const { service } = makeService();
        await expect(service.isVerified('k')).resolves.toBe(false);
    });

    it('remembers a session once marked verified', async () => {
        const { service } = makeService();

        await service.markVerified('k');

        await expect(service.isVerified('k')).resolves.toBe(true);
    });

    it('keeps verification per session', async () => {
        const { service } = makeService();

        await service.markVerified('k1');

        await expect(service.isVerified('k2')).resolves.toBe(false);
    });
});

describe('WidgetSessionService.isOriginAllowed', () => {
    it('accepts an origin on the allowlist', () => {
        const { service } = makeService();
        expect(
            service.isOriginAllowed(
                ['https://shop.example.com'],
                'https://shop.example.com'
            )
        ).toBe(true);
    });

    it('ignores case and a trailing path on the claimed origin', () => {
        const { service } = makeService();
        expect(
            service.isOriginAllowed(
                ['https://shop.example.com'],
                'HTTPS://Shop.Example.com/checkout'
            )
        ).toBe(true);
    });

    it('rejects a different host', () => {
        const { service } = makeService();
        expect(
            service.isOriginAllowed(
                ['https://shop.example.com'],
                'https://evil.example.com'
            )
        ).toBe(false);
    });

    it('rejects a different scheme or port', () => {
        const { service } = makeService();
        expect(
            service.isOriginAllowed(
                ['https://shop.example.com'],
                'http://shop.example.com'
            )
        ).toBe(false);
        expect(
            service.isOriginAllowed(
                ['https://shop.example.com'],
                'https://shop.example.com:8443'
            )
        ).toBe(false);
    });

    it('rejects a missing or unparseable claim', () => {
        const { service } = makeService();
        expect(
            service.isOriginAllowed(['https://shop.example.com'], undefined)
        ).toBe(false);
        expect(
            service.isOriginAllowed(['https://shop.example.com'], 'not a url')
        ).toBe(false);
    });

    it('rejects everything when the allowlist is empty', () => {
        const { service } = makeService();
        expect(
            service.isOriginAllowed([], 'https://shop.example.com')
        ).toBe(false);
    });
});
