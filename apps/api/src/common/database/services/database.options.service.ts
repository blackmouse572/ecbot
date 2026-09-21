import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import {
    Dictionary,
    PoolConfig,
    PostgreSqlDriver,
} from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

// Alias keeps the factory method's signature short.
type PostgresOptions = MikroOrmModuleOptions<PostgreSqlDriver>;

@Injectable()
export class DatabaseOptionService {
    constructor(private readonly configService: ConfigService) {}

    createMikroOrmOptions(): PostgresOptions {
        const env = this.configService.get<string>('app.env');

        const dbName = this.configService.get<string>(
            'database.mikroOrm.dbName'
        );
        const url = this.configService.get<string>('database.url');
        const debug = this.configService.get<boolean>('database.debug');
        const ssl = this.configService.get<boolean>('database.ssl');

        // Use PostgreSQL-compatible pool options instead of MongoDB options
        let poolOptions: PoolConfig;

        if (env === ENUM_APP_ENVIRONMENT.MIGRATION) {
            poolOptions = {
                max: 20,
                min: 5,
                acquireTimeoutMillis: 60000, // 60 seconds
                idleTimeoutMillis: 120000, // Increased from 60000
            };
        } else {
            // Default PostgreSQL pool options for non-migration environments.
            // max kept low (5) to bound per-connection buffers/prepared-stmt
            // memory on constrained (512MB) instances.
            poolOptions = {
                max: 5,
                min: 2,
                acquireTimeoutMillis: 30000,
                idleTimeoutMillis: 60000,
            };
        }

        let driverOptions: Dictionary | undefined;

        if (ssl) {
            driverOptions = {
                connection: {
                    ssl: {
                        rejectUnauthorized: false,
                    },
                },
            };
        }
        return {
            driver: PostgreSqlDriver,
            clientUrl: url,
            dbName: dbName,
            debug: env !== ENUM_APP_ENVIRONMENT.PRODUCTION ? debug : false,
            pool: poolOptions,
            autoLoadEntities: true,
            driverOptions: driverOptions,
            // Every DB entry point must establish a request context: HTTP via the
            // Nest middleware, BullMQ via ContextualWorkerHost, cron via
            // @ContextualCron. `false` makes an uncovered path throw loudly
            // instead of silently leaking into the never-cleared global identity
            // map (the >512MB OOM). Do NOT flip back to `true` to silence a
            // throw — establish a context at the offending entry point instead.
            allowGlobalContext: false,
            migrations: {
                tableName: 'mikro_orm_migrations',
                transactional: true,
                disableForeignKeys: false,
                allOrNothing: true,
                dropTables: false,
                safe: false,
                emit: 'ts',
                path: './migrations',
                pathTs: './migrations',
            },
        };
    }
}
