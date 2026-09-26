import { ChannelRateLimitService } from '../../../src/modules/platform/services/channel-rate-limit.service';

function makeService() {
    const counters = new Map<string, number>();
    const expires: string[] = [];
    const client = {
        incr: jest.fn(async (key: string) => {
            const next = (counters.get(key) ?? 0) + 1;
            counters.set(key, next);
            return next;
        }),
        expire: jest.fn(async (key: string) => {
            expires.push(key);
            return 1;
        }),
    };
    const queue = { getBackend: () => ({ client: Promise.resolve(client) }) };
    const service = new ChannelRateLimitService(queue as any, true);
    return { service, client, counters, expires };
}

describe('ChannelRateLimitService.claim', () => {
    it('allows calls up to the limit and rejects past it', async () => {
        const { service } = makeService();

        for (let i = 0; i < 3; i++) {
            expect(await service.claim('api:cred-1', 3, 60)).toBe(true);
        }
        expect(await service.claim('api:cred-1', 3, 60)).toBe(false);
    });

    it('counts each key independently', async () => {
        const { service } = makeService();

        expect(await service.claim('api:cred-1', 1, 60)).toBe(true);
        expect(await service.claim('api:cred-1', 1, 60)).toBe(false);
        expect(await service.claim('api:cred-2', 1, 60)).toBe(true);
    });

    it('sets the window TTL only on the first call of a window', async () => {
        const { service, client } = makeService();

        await service.claim('api:cred-1', 5, 60);
        await service.claim('api:cred-1', 5, 60);

        expect(client.expire).toHaveBeenCalledTimes(1);
    });

    it('counts atomically via INCR, not read-modify-write', async () => {
        const { service, client } = makeService();

        await service.claim('api:cred-1', 5, 60);

        expect(client.incr).toHaveBeenCalledWith(
            'channel-rate:api:cred-1'
        );
    });

    it('fails open when Redis is unreachable rather than blocking traffic', async () => {
        const client = {
            incr: jest.fn(async () => {
                throw new Error('redis down');
            }),
            expire: jest.fn(),
        };
        const service = new ChannelRateLimitService(
            { getBackend: () => ({ client: Promise.resolve(client) }) } as any,
            true
        );

        expect(await service.claim('api:cred-1', 1, 60)).toBe(true);
    });
});

describe('ChannelRateLimitService.claim — no Redis at boot', () => {
    const services: ChannelRateLimitService[] = [];

    function makeInMemoryService() {
        const client = { incr: jest.fn(), expire: jest.fn() };
        const service = new ChannelRateLimitService(
            { getBackend: () => ({ client: Promise.resolve(client) }) } as any,
            false
        );
        services.push(service);
        return service;
    }

    afterEach(() => {
        services.splice(0).forEach(s => s.onModuleDestroy());
    });

    it('enforces the limit in-process without touching Redis', async () => {
        const service = makeInMemoryService();

        for (let i = 0; i < 3; i++) {
            expect(await service.claim('api:cred-1', 3, 60)).toBe(true);
        }
        expect(await service.claim('api:cred-1', 3, 60)).toBe(false);
    });

    it('resets the window once it expires', async () => {
        jest.useFakeTimers().setSystemTime(0);
        const service = makeInMemoryService();

        expect(await service.claim('api:cred-1', 1, 1)).toBe(true);
        expect(await service.claim('api:cred-1', 1, 1)).toBe(false);

        jest.setSystemTime(1001);
        expect(await service.claim('api:cred-1', 1, 1)).toBe(true);

        jest.useRealTimers();
    });
});

describe('ChannelRateLimitService — in-memory sweep lifecycle', () => {
    function fakeQueue() {
        return { getBackend: () => ({ client: Promise.resolve({ incr: jest.fn(), expire: jest.fn() }) }) };
    }

    it('does not schedule a sweep when Redis is available', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        new ChannelRateLimitService(fakeQueue() as any, true);
        expect(setIntervalSpy).not.toHaveBeenCalled();
        setIntervalSpy.mockRestore();
    });

    it('schedules a sweep when Redis is unavailable and clears it on destroy', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        const service = new ChannelRateLimitService(fakeQueue() as any, false);
        expect(setIntervalSpy).toHaveBeenCalledTimes(1);

        service.onModuleDestroy();
        expect(clearIntervalSpy).toHaveBeenCalledWith(
            setIntervalSpy.mock.results[0].value
        );

        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
    });
});
