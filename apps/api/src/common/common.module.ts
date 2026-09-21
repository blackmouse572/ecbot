import KeyvRedis from '@keyv/redis';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { loadEnterpriseConfigs } from 'src/app/enterprise.loader';
import {
    DatabaseModule,
    DatabaseOptionModule,
} from 'src/common/database/database.module';
import { DatabaseOptionService } from 'src/common/database/services/database.options.service';
import { FileModule } from 'src/common/file/file.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { LoggerOptionModule } from 'src/common/logger/logger.option.module';
import { LoggerOptionService } from 'src/common/logger/services/logger.option.service';
import { MessageModule } from 'src/common/message/message.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { RequestModule } from 'src/common/request/request.module';
import configs from 'src/configs';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PolicyModule } from 'src/modules/policy/policy.module';
import { FacebookModule } from './facebook/facebook.module';
import { ComposioModule } from './composio/composio.module';
import { BullRedisConnectionProvider } from './redis/bull-redis-connection.provider';
import { RedisAvailabilityModule } from './redis/redis-availability.module';
import { REDIS_AVAILABLE } from './redis/redis-availability.provider';

@Module({
    controllers: [],
    providers: [],
    imports: [
        RedisAvailabilityModule,
        ClsModule.forRoot({
            global: true,
            middleware: { mount: true, saveReq: true },
        }),
        ConfigModule.forRoot({
            load: [...configs, ...loadEnterpriseConfigs()],
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
            expandVariables: false,
        }),
        MikroOrmModule.forRootAsync({
            imports: [DatabaseOptionModule],
            // contextName: DATABASE_CONNECTION_NAME,
            inject: [DatabaseOptionService],
            useFactory: (databaseService: DatabaseOptionService) =>
                databaseService.createMikroOrmOptions(),
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            // Shared ioredis client; quit on shutdown by its provider.
            inject: [BullRedisConnectionProvider],
            useFactory: (bullRedisConnection: BullRedisConnectionProvider) => ({
                connection: bullRedisConnection.client,
                skipStalledCheck: true, // Skip stalled job checks for lower Redis usage
                defaultJobOptions: {
                    backoff: {
                        type: 'exponential',
                        delay: 3000,
                    },
                    attempts: 3,
                    removeOnComplete: true, // Clean up completed jobs
                    removeOnFail: { count: 10 }, // Keep only 10 failed jobs
                },
            }),
        }),
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            useFactory: async (
                configService: ConfigService,
                redisAvailable: boolean
            ): Promise<CacheOptions> => ({
                max: configService.get<number>('redis.cached.max'),
                ttl: configService.get<number>('redis.cached.ttl'),
                // Redis was unreachable at boot — fall back to Keyv's default
                // in-memory Map store instead of KeyvRedis (no `stores`).
                stores: redisAvailable
                    ? [
                          new KeyvRedis({
                              socket: {
                                  host: configService.get<string>(
                                      'redis.cached.host'
                                  ),
                                  port: configService.get<number>(
                                      'redis.cached.port'
                                  ),
                                  tls: configService.get<boolean>(
                                      'redis.cached.tls'
                                  ),
                                  family: 0, // Fix for Railway DNS resolution issues
                              },
                              username: configService.get<string>(
                                  'redis.cached.username'
                              ),
                              password: configService.get<string>(
                                  'redis.cached.password'
                              ),
                          }),
                      ]
                    : undefined,
            }),
            inject: [ConfigService, REDIS_AVAILABLE],
        }),
        PinoLoggerModule.forRootAsync({
            imports: [LoggerOptionModule],
            inject: [LoggerOptionService],
            useFactory: async (loggerOptionService: LoggerOptionService) => {
                return loggerOptionService.createOptions();
            },
        }),
        MessageModule.forRoot(),
        HelperModule.forRoot(),
        RequestModule.forRoot(),
        PolicyModule.forRoot(),
        AuthModule.forRoot(),
        FileModule.forRoot(),
        DatabaseModule.forRoot(),
        PaginationModule.forRoot(),
        FacebookModule.forRoot(),
        ComposioModule.forRoot(),
    ],
})
export class CommonModule {}
