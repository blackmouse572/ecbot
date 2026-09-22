import { defineConfig, Dictionary } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations'; // or `@mikro-orm/migrations-mongodb`
import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import slugify from 'slugify';

// Load environment variables
config();

// The enterprise overlay materialises src/ee (and dist/ee) only in the hosted
// build. In the open engine those paths do not exist, so the globs below stay
// off and migration commands never see hosted entities — that is what keeps
// `migration:check` honest here. When the overlay is linked the globs switch on
// and the snapshot switches with them, so the two editions never diff against
// each other's schema.
const hasEnterpriseOverlayTs = existsSync(join(__dirname, 'src/ee'));
const hasEnterpriseOverlayJs = existsSync(join(__dirname, 'dist/ee'));
const hasEnterpriseOverlay = hasEnterpriseOverlayTs || hasEnterpriseOverlayJs;

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
        // common+modules so the src/ee/ tree stays invisible to migration
        // commands unless the enterprise overlay is actually linked.
        entities: [
            'dist/{common,modules}/**/*.entity.js',
            ...(hasEnterpriseOverlayJs ? ['dist/ee/**/*.entity.js'] : []),
        ],
        entitiesTs: [
            'src/{common,modules}/**/*.entity.ts',
            ...(hasEnterpriseOverlayTs ? ['src/ee/**/*.entity.ts'] : []),
        ],

        // Migration settings
        migrations: {
            path: './migrations',
            pathTs: './migrations',
            // Pinned rather than derived from the database name, so a scratch
            // database does not silently write a second snapshot. The overlay
            // gets its own file because its schema is a superset of this one.
            snapshotName: hasEnterpriseOverlay
                ? '.snapshot-ee'
                : '.snapshot-neondb',
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

        // Tables that exist in some databases but have no entity here:
        // `rag_documents` / `rag_document_chunks` are raw SQL owned by apps/ai
        // (it moved them to the `rag` schema, older installs still have the
        // public copies), and `chat_sessions`, `chat_session_messages`,
        // `chatbots_accounts` are leftovers of entities that were removed.
        // Without this the schema diff proposes dropping them on every run.
        schemaGenerator: {
            skipTables: [
                'rag_documents',
                'rag_document_chunks',
                'chat_sessions',
                'chat_session_messages',
                'chatbots_accounts',
            ],
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
