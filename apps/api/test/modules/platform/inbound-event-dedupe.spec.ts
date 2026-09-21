import { InboundEventDedupeService } from '../../../src/modules/platform/services/inbound-event-dedupe.service';

/**
 * Minimal in-memory fake of the ioredis subset the seam uses (SET NX EX),
 * mirroring generation-lease.spec.ts's fakeQueue pattern.
 */
function fakeQueue() {
    const store = new Set<string>();
    const client = {
        async set(
            key: string,
            _value: string,
            _ex: 'EX',
            _ttl: number,
            nx: 'NX'
        ) {
            if (nx === 'NX' && store.has(key)) return null;
            store.add(key);
            return 'OK';
        },
        async del(key: string) {
            return store.delete(key) ? 1 : 0;
        },
    };
    return { client: Promise.resolve(client) } as any;
}

describe('InboundEventDedupeService (candidate 1)', () => {
    let dedupe: InboundEventDedupeService;

    beforeEach(() => {
        dedupe = new InboundEventDedupeService(fakeQueue(), true);
    });

    it('claims a (platform, externalMessageId) pair the first time it is seen', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
    });

    it('refuses the claim on redelivery of the same pair', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(false);
    });

    // A turn that fails releases its claim so the retry can rerun it.
    it('re-claims after release', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
        await dedupe.release('TELEGRAM', 'msg-1');
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
    });

    it('tracks claims per platform independently — same message id, different platform', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
        expect(await dedupe.claim('MESSENGER', 'msg-1')).toBe(true);
    });

    it('tracks claims per externalMessageId independently — same platform, different message', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
        expect(await dedupe.claim('TELEGRAM', 'msg-2')).toBe(true);
    });
});

describe('InboundEventDedupeService — no Redis at boot', () => {
    let dedupe: InboundEventDedupeService;

    beforeEach(() => {
        dedupe = new InboundEventDedupeService(fakeQueue(), false);
    });

    afterEach(() => {
        dedupe.onModuleDestroy();
    });

    it('claims and refuses redelivery in-process without touching Redis', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(false);
    });

    it('re-claims after release', async () => {
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
        await dedupe.release('TELEGRAM', 'msg-1');
        expect(await dedupe.claim('TELEGRAM', 'msg-1')).toBe(true);
    });
});

describe('InboundEventDedupeService — in-memory sweep lifecycle', () => {
    it('does not schedule a sweep when Redis is available', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        new InboundEventDedupeService(fakeQueue(), true);
        expect(setIntervalSpy).not.toHaveBeenCalled();
        setIntervalSpy.mockRestore();
    });

    it('schedules a sweep when Redis is unavailable and clears it on destroy', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        const dedupe = new InboundEventDedupeService(fakeQueue(), false);
        expect(setIntervalSpy).toHaveBeenCalledTimes(1);

        dedupe.onModuleDestroy();
        expect(clearIntervalSpy).toHaveBeenCalledWith(
            setIntervalSpy.mock.results[0].value
        );

        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
    });
});
