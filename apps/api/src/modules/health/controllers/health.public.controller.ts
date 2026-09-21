import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
    HealthCheck,
    HealthCheckService,
    MikroOrmHealthIndicator,
} from '@nestjs/terminus';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    HealthPublicLiveDoc,
    HealthPublicReadyDoc,
} from 'src/modules/health/docs/health.public.doc';
import { HealthDatabaseResponseDto } from 'src/modules/health/dtos/response/health.database.response.dto';
import { HealthRedisIndicator } from 'src/modules/health/indicators/health.redis.indicator';

/**
 * Unauthenticated liveness/readiness probes (#129). Kept out of
 * `HealthSystemController` (whose routes are `@ApiKeySystemProtected`) so a load
 * balancer / uptime pinger can reach them. `@SkipThrottle` stops frequent probe
 * pings from tripping the global rate limiter.
 */
@ApiTags('modules.public.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthPublicController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly mikroOrmIndicator: MikroOrmHealthIndicator,
        private readonly redisIndicator: HealthRedisIndicator
    ) {}

    // Liveness: process is up. NO dependency checks — a Redis/DB blip must not
    // make the orchestrator kill an otherwise-healthy pod.
    @HealthPublicLiveDoc()
    @Response('health.live')
    @SkipThrottle()
    @HealthCheck()
    @Get('/live')
    async live(): Promise<IResponse<HealthDatabaseResponseDto>> {
        const data = await this.health.check([]);

        return {
            data,
        };
    }

    // Readiness: only route traffic / admit a new replica when the deps the app
    // needs to actually serve are reachable. Terminus returns 503 if any is down.
    @HealthPublicReadyDoc()
    @Response('health.ready')
    @SkipThrottle()
    @HealthCheck()
    @Get('/ready')
    async ready(): Promise<IResponse<HealthDatabaseResponseDto>> {
        const data = await this.health.check([
            () => this.mikroOrmIndicator.pingCheck('database'),
            () => this.redisIndicator.isHealthy('redis'),
        ]);

        return {
            data,
        };
    }
}
