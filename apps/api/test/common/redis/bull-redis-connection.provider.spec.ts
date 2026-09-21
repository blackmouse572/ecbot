import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullRedisConnectionProvider } from '@app/common/redis/bull-redis-connection.provider';

interface StubClient {
    status: string;
    quit: jest.Mock;
    disconnect: jest.Mock;
}

const mockOn = jest.fn();

jest.mock('ioredis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
        on: mockOn,
    })),
}));

const { Redis: mockRedisCtor } = jest.requireMock('ioredis') as {
    Redis: jest.Mock;
};

function fakeConfigService(): ConfigService {
    return { get: jest.fn(() => undefined) } as unknown as ConfigService;
}

function makeProvider(stub: StubClient): BullRedisConnectionProvider {
    const provider = new BullRedisConnectionProvider(fakeConfigService(), true);
    (provider as unknown as { client: StubClient }).client = stub;
    return provider;
}

describe('BullRedisConnectionProvider.onModuleDestroy', () => {
    it('quits a live client', async () => {
        const stub: StubClient = {
            status: 'ready',
            quit: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn(),
        };

        await makeProvider(stub).onModuleDestroy();

        expect(stub.quit).toHaveBeenCalledTimes(1);
        expect(stub.disconnect).not.toHaveBeenCalled();
    });

    it.each(['end', 'reconnecting', 'connecting'])(
        'disconnects instead of quitting when the connection is %s',
        async status => {
            const stub: StubClient = {
                status,
                quit: jest.fn(),
                disconnect: jest.fn(),
            };

            await makeProvider(stub).onModuleDestroy();

            expect(stub.quit).not.toHaveBeenCalled();
            expect(stub.disconnect).toHaveBeenCalledTimes(1);
        }
    );

    it('falls back to disconnect when quit rejects', async () => {
        const stub: StubClient = {
            status: 'ready',
            quit: jest
                .fn()
                .mockRejectedValue(new Error('Connection is closed.')),
            disconnect: jest.fn(),
        };

        await expect(
            makeProvider(stub).onModuleDestroy()
        ).resolves.toBeUndefined();
        expect(stub.disconnect).toHaveBeenCalledTimes(1);
    });
});

describe('BullRedisConnectionProvider construction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('disables retries when Redis was unavailable at boot', () => {
        new BullRedisConnectionProvider(fakeConfigService(), false);

        const options = mockRedisCtor.mock.calls[0][0] as {
            retryStrategy: () => number | null;
        };
        expect(options.retryStrategy()).toBeNull();
    });

    it('logs a bounded warning instead of letting ioredis dump the raw error', () => {
        const warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
        new BullRedisConnectionProvider(fakeConfigService(), true);

        const errorCall = mockOn.mock.calls.find(
            ([event]) => event === 'error'
        );
        expect(errorCall).toBeDefined();
        const handler = errorCall![1] as (error: NodeJS.ErrnoException) => void;
        handler(
            Object.assign(new Error('connect ECONNREFUSED'), {
                code: 'ECONNREFUSED',
            })
        );

        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('ECONNREFUSED')
        );
        warn.mockRestore();
    });
});
