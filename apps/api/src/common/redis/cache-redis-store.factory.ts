import KeyvRedis from '@keyv/redis';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('CacheRedis');

/**
 * The cache-manager store. @keyv/redis forwards connect, disconnect and
 * reconnecting from its node-redis client but not `error`, so a socket reset
 * (managed Redis dropping an idle TLS connection) went unhandled and Node
 * exited the process. With a listener, node-redis just reconnects.
 */
export function createCacheRedisStore(
    configService: ConfigService
): KeyvRedis<unknown> {
    const store = new KeyvRedis({
        socket: {
            host: configService.get<string>('redis.cached.host'),
            port: configService.get<number>('redis.cached.port'),
            tls: configService.get<boolean>('redis.cached.tls'),
            family: 0, // Fix for Railway DNS resolution issues
        },
        username: configService.get<string>('redis.cached.username'),
        password: configService.get<string>('redis.cached.password'),
    });
    store.client.on('error', (error: NodeJS.ErrnoException) => {
        logger.warn(
            `Cache Redis connection error (${error.code ?? 'unknown'}): ${error.message}`
        );
    });
    return store;
}
