import { Test } from '@nestjs/testing';
import { HealthCheckService, MikroOrmHealthIndicator } from '@nestjs/terminus';
import { HealthPublicController } from '@app/modules/health/controllers/health.public.controller';
import { HealthRedisIndicator } from '@app/modules/health/indicators/health.redis.indicator';

describe('HealthPublicController', () => {
    // Stub HealthCheckService.check: run the passed indicator thunks (so we can
    // assert which deps each route probes) and echo a status.
    const check = jest.fn(
        async (indicators: Array<() => Promise<any>> = []) => {
            await Promise.all(indicators.map(fn => fn()));
            return { status: 'ok', details: {} };
        }
    );
    const pingCheck = jest
        .fn()
        .mockResolvedValue({ database: { status: 'up' } });
    const redisIsHealthy = jest
        .fn()
        .mockResolvedValue({ redis: { status: 'up' } });

    let controller: HealthPublicController;

    beforeEach(async () => {
        check.mockClear();
        pingCheck.mockClear();
        redisIsHealthy.mockClear();

        const moduleRef = await Test.createTestingModule({
            controllers: [HealthPublicController],
            providers: [
                { provide: HealthCheckService, useValue: { check } },
                { provide: MikroOrmHealthIndicator, useValue: { pingCheck } },
                {
                    provide: HealthRedisIndicator,
                    useValue: { isHealthy: redisIsHealthy },
                },
            ],
        }).compile();

        controller = moduleRef.get(HealthPublicController);
    });

    it('liveness checks NO dependencies (a dep blip must not fail liveness)', async () => {
        const res = await controller.live();

        expect(check).toHaveBeenCalledWith([]);
        expect(pingCheck).not.toHaveBeenCalled();
        expect(redisIsHealthy).not.toHaveBeenCalled();
        expect(res.data.status).toBe('ok');
    });

    it('readiness probes both database and Redis', async () => {
        const res = await controller.ready();

        expect(pingCheck).toHaveBeenCalledWith('database');
        expect(redisIsHealthy).toHaveBeenCalledWith('redis');
        expect(res.data.status).toBe('ok');
    });
});
