import { defineConfig, Dictionary } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations'; // or `@mikro-orm/migrations-mongodb`
import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { config } from 'dotenv';
import slugify from 'slugify';

// Load environment variables
config();

const getMikroOrmConfig = (): MikroOrmModuleOptions => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isMigration = process.env.APP_ENV === 'migration';
    const isDatabaseSslEnabled = process.env.DATABASE_SSL === 'true';
    const clientUrl = process.env.DATABASE_URL;

    let driverOptions: Dictionary | undefined;

    if (isDatabaseSslEnabled) {
        driverOptions = {
            connection: {
                ssl: {
                    rejectUnauthorized: false,
                },
            },
        };
    }

    return defineConfig({
        extensions: [Migrator],
        driver: PostgreSqlDriver,
        driverOptions: driverOptions,
        clientUrl: clientUrl,

        // Entity discovery (CLI only; runtime uses autoLoadEntities). Scoped to
        // common+modules so a future src/ee/ tree stays invisible to migration commands.
        entities: ['dist/{common,modules}/**/*.entity.js'],
        entitiesTs: ['src/{common,modules}/**/*.entity.ts'],

        // Migration settings
        migrations: {
            path: './migrations',
            pathTs: './migrations',
            tableName: 'mikro_orm_migrations',
            fileName: (timestamp: string, name) =>
                `${timestamp}_${slugify(name || 'migration', { lower: true, trim: true, replacement: '_' })}`,
            transactional: true,
            disableForeignKeys: false,
            allOrNothing: true,
            dropTables: false,
            safe: false,
            emit: 'ts',
        },
        // Seeder settings
        seeder: {
            path: './dist/migration/seeds',
            pathTs: './src/migration/seeds',
            defaultSeeder: 'DatabaseSeeder',
            glob: '!(*.d).{js,ts}',
            emit: 'ts',
        },

        // Debug and logging
        debug: !isProduction,
        logger: message => {
            if (!isProduction) {
                console.log(message);
            }
        },

        // Pool configuration
        pool: isMigration
            ? {
                  max: 20,
                  min: 5,
                  acquireTimeoutMillis: 60000,
                  idleTimeoutMillis: 120000,
              }
            : {
                  max: 10,
                  min: 2,
                  acquireTimeoutMillis: 30000,
                  idleTimeoutMillis: 60000,
              },

        // Schema settings
        allowGlobalContext: true,
        forceEntityConstructor: true,
        discovery: {
            warnWhenNoEntities: false,
        },

        // Metadata cache
        metadataCache: {
            enabled: isProduction,
            adapter: isProduction
                ? require('@mikro-orm/core').FileCacheAdapter
                : require('@mikro-orm/core').NullCacheAdapter,
            options: { cacheDir: './temp' },
        },
    });
};

export default getMikroOrmConfig();
