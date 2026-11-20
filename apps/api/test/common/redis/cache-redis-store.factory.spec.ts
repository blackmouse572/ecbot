import { createCacheRedisStore } from '../../../src/common/redis/cache-redis-store.factory';

function fakeConfigService() {
    return { get: jest.fn(() => undefined) } as any;
}

describe('createCacheRedisStore', () => {
    // node-redis emits `error` on a socket reset (managed Redis drops idle TLS
    // connections). With no listener Node throws it and the process exits,
    // which is how prod crashed about twice a day.
    it('survives a connection error on the underlying client', () => {
        const store = createCacheRedisStore(fakeConfigService());
        const reset = Object.assign(new Error('read ECONNRESET'), {
            code: 'ECONNRESET',
        });

        expect(() => store.client.emit('error', reset)).not.toThrow();
    });
});
