import { GenerationLeaseService } from '../../../src/modules/platform/services/generation-lease.service';

/**
 * Minimal in-memory fake of the ioredis subset the lease uses (INCR/EXPIRE/GET).
 * This is the second adapter the seam justifies — Redis in prod, this in tests.
 */
function fakeQueue() {
    const store = new Map<string, number>();
    const client = {
        async incr(key: string) {
            const next = (store.get(key) ?? 0) + 1;
            store.set(key, next);
            return next;
        },
        async expire() {
            return 1;
        },
        async get(key: string) {
            return store.has(key) ? String(store.get(key)) : null;
        },
    };
    return { getBackend: () => ({ client: Promise.resolve(client) }) } as any;
}

describe('GenerationLeaseService (candidate 2)', () => {
    let lease: GenerationLeaseService;

    beforeEach(() => {
        lease = new GenerationLeaseService(fakeQueue(), true);
    });

    it('starts at epoch 0 and bumps monotonically', async () => {
        expect(await lease.current('c1')).toBe(0);
        expect(await lease.bump('c1')).toBe(1);
        expect(await lease.bump('c1')).toBe(2);
        expect(await lease.current('c1')).toBe(2);
    });

    it('isCurrent holds until a newer bump supersedes the captured epoch', async () => {
        await lease.bump('c1'); // epoch 1
        const myEpoch = await lease.current('c1');
        expect(await lease.isCurrent('c1', myEpoch)).toBe(true);

        await lease.bump('c1'); // a newer message → epoch 2
        expect(await lease.isCurrent('c1', myEpoch)).toBe(false);
    });

    it('tracks epochs per conversation independently', async () => {
        await lease.bump('a');
        await lease.bump('a');
        await lease.bump('b');
        expect(await lease.current('a')).toBe(2);
        expect(await lease.current('b')).toBe(1);
    });
});

describe('GenerationLeaseService — no Redis at boot', () => {
    let lease: GenerationLeaseService;

    beforeEach(() => {
        lease = new GenerationLeaseService(fakeQueue(), false);
    });

    afterEach(() => {
        lease.onModuleDestroy();
    });

    it('bumps monotonically in-process without touching Redis', async () => {
        expect(await lease.current('c1')).toBe(0);
        expect(await lease.bump('c1')).toBe(1);
        expect(await lease.bump('c1')).toBe(2);
        expect(await lease.current('c1')).toBe(2);
    });

    it('isCurrent still detects supersession', async () => {
        await lease.bump('c1');
        const myEpoch = await lease.current('c1');
        expect(await lease.isCurrent('c1', myEpoch)).toBe(true);

        await lease.bump('c1');
        expect(await lease.isCurrent('c1', myEpoch)).toBe(false);
    });
});

describe('GenerationLeaseService — in-memory sweep lifecycle', () => {
    it('does not schedule a sweep when Redis is available', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        new GenerationLeaseService(fakeQueue(), true);
        expect(setIntervalSpy).not.toHaveBeenCalled();
        setIntervalSpy.mockRestore();
    });

    it('schedules a sweep when Redis is unavailable and clears it on destroy', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        const lease = new GenerationLeaseService(fakeQueue(), false);
        expect(setIntervalSpy).toHaveBeenCalledTimes(1);

        lease.onModuleDestroy();
        expect(clearIntervalSpy).toHaveBeenCalledWith(
            setIntervalSpy.mock.results[0].value
        );

        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
    });
});
