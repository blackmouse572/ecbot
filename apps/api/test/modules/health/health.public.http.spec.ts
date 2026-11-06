import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
    HealthIndicatorService,
    MikroOrmHealthIndicator,
    TerminusModule,
} from '@nestjs/terminus';
import request from 'supertest';
import { AppHttpFilter } from '@app/app/filters/app.http.filter';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { MessageService } from '@app/common/message/services/message.service';
import { HealthBuildInfoPublicController } from '@app/modules/health/controllers/health.build-info.public.controller';
import { HealthPublicController } from '@app/modules/health/controllers/health.public.controller';
import { HealthRedisIndicator } from '@app/modules/health/indicators/health.redis.indicator';

/**
 * Probes the public health routes over real HTTP, with the real Terminus
 * HealthCheckService and the app's HttpException filter, so what an uptime
 * checker or load balancer sees is what we assert: the status line and the
 * Cache-Control header, not the controller's return value.
 */
// test/modules/account/setup.ts stubs the response interceptor for every
// spec; this one asserts the real envelope, so it puts it back.
jest.unmock('@app/common/response/interceptors/response.interceptor');

describe('Public health routes over HTTP', () => {
    const state = { database: true, redis: true };
    const build: Record<string, string | undefined> = {};

    let app: INestApplication;

    beforeAll(async () => {
        const config: Record<string, unknown> = {
            'app.globalPrefix': '/api',
            'doc.prefix': '/docs',
            'message.language': 'en',
            'app.urlVersion.version': '1',
            'app.version': '0.0.0',
        };

        @Module({
            imports: [TerminusModule],
            controllers: [
                HealthPublicController,
                HealthBuildInfoPublicController,
            ],
            providers: [
                {
                    provide: MikroOrmHealthIndicator,
                    inject: [HealthIndicatorService],
                    useFactory: (indicators: HealthIndicatorService) => ({
                        pingCheck: async (key: string) =>
                            state.database
                                ? indicators.check(key).up()
                                : indicators.check(key).down('db down'),
                    }),
                },
                {
                    provide: HealthRedisIndicator,
                    inject: [HealthIndicatorService],
                    useFactory: (indicators: HealthIndicatorService) => ({
                        isHealthy: async (key: string) =>
                            state.redis
                                ? indicators.check(key).up()
                                : indicators.check(key).down('redis down'),
                    }),
                },
            ],
        })
        class PublicHealthModule {}

        // The app-wide services the response interceptor and the exception
        // filter inject, shared with every module like the real app does.
        @Global()
        @Module({
            providers: [
                { provide: APP_FILTER, useClass: AppHttpFilter },
                {
                    provide: ConfigService,
                    useValue: {
                        get: (key: string) =>
                            key.startsWith('app.build.')
                                ? build[key.slice('app.build.'.length)]
                                : config[key],
                    },
                },
                {
                    provide: MessageService,
                    useValue: { setMessage: (path: string) => path },
                },
                {
                    provide: HelperDateService,
                    useValue: {
                        create: () => new Date(),
                        getTimestamp: () => 0,
                        getZone: () => 'UTC',
                    },
                },
            ],
            exports: [ConfigService, MessageService, HelperDateService],
        })
        class AppServicesModule {}

        const moduleRef = await Test.createTestingModule({
            imports: [
                AppServicesModule,
                PublicHealthModule,
                RouterModule.register([
                    { path: '/public', module: PublicHealthModule },
                ]),
            ],
        }).compile();

        app = moduleRef.createNestApplication({ logger: false });
        app.setGlobalPrefix('/api');
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        state.database = true;
        state.redis = true;
        for (const key of Object.keys(build)) delete build[key];
    });

    it('/ready is 200 and no-store when the database and Redis are up', async () => {
        const res = await request(app.getHttpServer()).get(
            '/api/public/health/ready'
        );

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.headers['x-custom-lang']).toBe('en');
        expect(res.body.statusCode).toBe(200);
        expect(res.body.message).toBe('health.ready');
        expect(res.body._metadata.path).toBe('/api/public/health/ready');
        expect(res.body.data.status).toBe('ok');
    });

    it.each([
        ['Redis', 'redis'],
        ['the database', 'database'],
    ] as const)(
        '/ready is HTTP 503, not a wrapped 200, when %s is down',
        async (_name, dep) => {
            state[dep] = false;

            const res = await request(app.getHttpServer()).get(
                '/api/public/health/ready'
            );

            expect(res.status).toBe(503);
            expect(res.body.statusCode).toBe(503);
            expect(res.headers['cache-control']).toContain('no-store');
        }
    );

    it('/live stays 200 while the database and Redis are down', async () => {
        state.database = false;
        state.redis = false;

        const res = await request(app.getHttpServer()).get(
            '/api/public/health/live'
        );

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toContain('no-store');
    });

    it('/build-info reports the commit baked into the image, no-store', async () => {
        build.commit = 'abc1234def5678abc1234def5678abc1234def56';
        build.branch = 'main';
        build.builtAt = '2026-11-06T09:00:00Z';

        const res = await request(app.getHttpServer()).get(
            '/api/public/build-info'
        );

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body.message).toBe('health.buildInfo');
        expect(res.body.data).toEqual({
            commit: 'abc1234def5678abc1234def5678abc1234def56',
            branch: 'main',
            builtAt: '2026-11-06T09:00:00Z',
        });
    });

    it('/build-info says "unknown" when the image was built without them', async () => {
        const res = await request(app.getHttpServer()).get(
            '/api/public/build-info'
        );

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({
            commit: 'unknown',
            branch: 'unknown',
            builtAt: 'unknown',
        });
    });
});
