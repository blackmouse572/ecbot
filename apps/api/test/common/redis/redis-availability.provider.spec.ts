import { probeRedisAvailability } from '../../../src/common/redis/redis-availability.provider';

const connect = jest.fn();
const ping = jest.fn();
const disconnect = jest.fn();

jest.mock('ioredis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
        connect,
        ping,
        disconnect,
    })),
}));

function fakeConfigService() {
    return { get: jest.fn(() => undefined) } as any;
}

describe('probeRedisAvailability', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true when Redis connects and answers a ping', async () => {
        connect.mockResolvedValue(undefined);
        ping.mockResolvedValue('PONG');

        await expect(
            probeRedisAvailability(fakeConfigService())
        ).resolves.toBe(true);
        expect(disconnect).toHaveBeenCalled();
    });

    it('returns false when the connection attempt fails', async () => {
        connect.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(
            probeRedisAvailability(fakeConfigService())
        ).resolves.toBe(false);
        expect(disconnect).toHaveBeenCalled();
    });

    it('returns false when the ping fails after connecting', async () => {
        connect.mockResolvedValue(undefined);
        ping.mockRejectedValue(new Error('timeout'));

        await expect(
            probeRedisAvailability(fakeConfigService())
        ).resolves.toBe(false);
    });
});
