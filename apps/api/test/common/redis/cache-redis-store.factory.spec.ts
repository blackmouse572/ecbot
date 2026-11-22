import { Logger } from '@nestjs/common';
import { createCacheRedisStore } from '../../../src/common/redis/cache-redis-store.factory';

function fakeConfigService() {
    return { get: jest.fn(() => undefined) } as any;
}

describe('createCacheRedisStore', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
    });

    afterEach(() => warn.mockRestore());

    // node-redis emits `error` on a socket reset (managed Redis drops idle TLS
    // connections). With no listener Node throws it and the process exits,
    // which is how prod crashed about twice a day.
    it('survives and logs a connection error on the underlying client', () => {
        const store = createCacheRedisStore(fakeConfigService());
        const reset = Object.assign(new Error('read ECONNRESET'), {
            code: 'ECONNRESET',
        });

        expect(() => store.client.emit('error', reset)).not.toThrow();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('ECONNRESET')
        );
    });

    // @keyv/redis swallows a failed get/set and emits `error` on the store
    // itself, so without a listener the cache fails with no log line.
    it('logs a command error emitted by the store', () => {
        const store = createCacheRedisStore(fakeConfigService());
        const failure = Object.assign(new Error('Socket closed unexpectedly'), {
            code: 'ECONNRESET',
        });

        store.emit('error', failure);

        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Socket closed unexpectedly')
        );
    });
});
