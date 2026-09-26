import { HealthRedisIndicator } from '@app/modules/health/indicators/health.redis.indicator';

// Minimal stand-in for Terminus' HealthIndicatorService: `.check(key)` returns
// an object whose `.up()` / `.down()` echo the key + status so assertions stay simple.
function makeIndicatorService() {
    return {
        check: (key: string) => ({
            up: (data?: Record<string, unknown>) => ({
                [key]: { status: 'up', ...data },
            }),
            down: (message?: string) => ({
                [key]: { status: 'down', message },
            }),
        }),
    };
}

describe('HealthRedisIndicator', () => {
    const ping = jest.fn();
    const queue = { getBackend: () => ({ client: Promise.resolve({ ping }) }) };

    function build(redisAvailable = true) {
        return new HealthRedisIndicator(
            queue as any,
            makeIndicatorService() as any,
            redisAvailable
        );
    }

    beforeEach(() => {
        ping.mockReset();
    });

    it('returns up when the queue Redis client replies PONG', async () => {
        ping.mockResolvedValue('PONG');

        const result = await build().isHealthy('redis');

        expect(ping).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ redis: { status: 'up' } });
    });

    it('returns down when the ping throws', async () => {
        ping.mockRejectedValue(new Error('ECONNREFUSED'));

        const result = await build().isHealthy('redis');

        expect(result.redis.status).toBe('down');
        expect(result.redis.message).toContain('ECONNREFUSED');
    });

    it('returns down when the reply is not PONG', async () => {
        ping.mockResolvedValue('WEIRD');

        const result = await build().isHealthy('redis');

        expect(result.redis.status).toBe('down');
        expect(result.redis.message).toContain('WEIRD');
    });

    it('returns up without pinging when booted in in-memory fallback mode, flagged for dashboards', async () => {
        const result = await build(false).isHealthy('redis');

        expect(ping).not.toHaveBeenCalled();
        expect(result).toEqual({
            redis: { status: 'up', mode: 'in-memory-fallback' },
        });
    });
});
