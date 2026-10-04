import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';

describe('ImpersonationService', () => {
    const store = new Map<string, unknown>();
    const cache = {
        get: jest.fn(async (k: string) => store.get(k)),
        set: jest.fn(async (k: string, v: unknown, _ttl?: number) => {
            store.set(k, v);
        }),
        del: jest.fn(async (k: string) => void store.delete(k)),
    };
    const config = { get: jest.fn(() => 'eccho') };

    const build = () =>
        new ImpersonationService(cache as never, config as never);

    const handoff = {
        tokenType: 'Bearer',
        roleType: 'USER',
        accessToken: 'signed.jwt',
        expiresIn: 600,
        impersonatedBy: 'admin-1',
        session: 'session-1',
        target: { id: 'u1', name: 'Nguyen Van A', email: 'a@example.com' },
    };

    beforeEach(() => {
        store.clear();
        jest.clearAllMocks();
    });

    it('issues an opaque code and stores the handoff with a 60s TTL', async () => {
        const service = build();

        const code = await service.issue(handoff);

        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThanOrEqual(40);
        const [key, value, ttl] = cache.set.mock.calls[0];
        expect(key).toBe(`eccho:impersonation:code:${code}`);
        expect(value).toEqual(handoff);
        expect(ttl).toBe(60_000);
    });

    it('consume returns the handoff exactly once then null', async () => {
        const service = build();
        const code = await service.issue(handoff);

        await expect(service.consume(code)).resolves.toEqual(handoff);
        await expect(service.consume(code)).resolves.toBeNull();
    });

    it('consume is single-use under concurrent calls', async () => {
        const service = build();
        const code = await service.issue(handoff);

        const results = await Promise.all([
            service.consume(code),
            service.consume(code),
            service.consume(code),
        ]);

        expect(results.filter(Boolean)).toEqual([handoff]);
    });

    it('consume returns null for an unknown code', async () => {
        const service = build();
        await expect(service.consume('nope')).resolves.toBeNull();
    });

    describe('remainingSeconds', () => {
        it('reports the time left until expiresAt, not the full lifetime', () => {
            // minted 45s ago with a 600s lifetime
            expect(
                ImpersonationService.remainingSeconds(
                    { expiresIn: 600, expiresAt: 1_000_000 + 555_000 },
                    1_000_000
                )
            ).toBe(555);
        });

        it('never goes negative', () => {
            expect(
                ImpersonationService.remainingSeconds(
                    { expiresIn: 600, expiresAt: 500 },
                    1_000_000
                )
            ).toBe(0);
        });

        it('falls back to expiresIn for handoffs stored without expiresAt', () => {
            expect(
                ImpersonationService.remainingSeconds({ expiresIn: 600 })
            ).toBe(600);
        });
    });
});
