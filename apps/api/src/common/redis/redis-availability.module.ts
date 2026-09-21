import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullRedisConnectionProvider } from './bull-redis-connection.provider';
import {
    REDIS_AVAILABLE,
    probeRedisAvailability,
} from './redis-availability.provider';

/**
 * Global so any module can `@Inject(REDIS_AVAILABLE)` (or inject
 * BullRedisConnectionProvider) without importing this one directly (same
 * pattern as ConfigModule.forRoot({ isGlobal: true })).
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: REDIS_AVAILABLE,
            inject: [ConfigService],
            useFactory: probeRedisAvailability,
        },
        BullRedisConnectionProvider,
    ],
    exports: [REDIS_AVAILABLE, BullRedisConnectionProvider],
})
export class RedisAvailabilityModule {}
