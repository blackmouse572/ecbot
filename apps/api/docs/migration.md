# Overview

This documentation explains the MikroORM-based schema migration system used by the API:

- **Migration System**: MikroORM CLI migrations for the PostgreSQL schema
- **CLI Commands**: `pnpm` scripts (root and `apps/api`) wrapping the MikroORM CLI

Database seeding — the custom `nestjs-command` seed classes that populate initial data — is a separate system, documented in [Seeding](./seeding.md).

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
- [Migration Commands](#migration-commands)
  - [From Project Root (Turborepo)](#from-project-root-turborepo)
  - [From API Directory](#from-api-directory)
- [Configuration](#configuration)
- [Creating Migrations](#creating-migrations)
  - [Automatic Migration Generation](#automatic-migration-generation)
  - [Manual Migration Creation](#manual-migration-creation)
  - [Migration File Structure](#migration-file-structure)
- [Running Migrations](#running-migrations)
  - [Execute Migrations](#execute-migrations)
  - [Check Migration Status](#check-migration-status)
  - [Fresh Database Setup](#fresh-database-setup)
- [Database Seeding (MikroORM CLI)](#database-seeding-mikroorm-cli)
- [Environment Configuration](#environment-configuration)
  - [Environment-Specific Behavior](#environment-specific-behavior)
- [Examples](#examples)
  - [Migration Example](#migration-example)
  - [Seeder Example](#seeder-example)
- [Best Practices](#best-practices)

# Migration Commands

Schema migrations are handled entirely by the MikroORM CLI against `apps/api/mikro-orm.config.ts` — they do not go through `src/cli.ts` or the NestJS application context (that entry point only runs seed commands; see [Seeding](./seeding.md)).

## From Project Root (Turborepo)

```bash
# Migration operations
pnpm db:migrate:create        # Create a new migration
pnpm db:migrate:up            # Run pending migrations
pnpm db:migrate:down          # Rollback last migration
pnpm db:migrate:list          # List all migrations
pnpm db:migrate:check         # Check if migrations are needed
pnpm db:migrate:pending       # List pending migrations
pnpm db:migrate:fresh         # Drop database and run all migrations

# Schema operations
pnpm db:schema:create         # Create database schema
pnpm db:schema:drop           # Drop database schema
pnpm db:schema:update         # Update schema to match entities
pnpm db:schema:fresh          # Drop and recreate schema

# Utility operations
pnpm db:cache:clear           # Clear metadata cache
pnpm db:generate-entities     # Generate entities from an existing database
```

Each root script runs the matching `apps/api` script via `turbo run <script> --filter api`.

## From API Directory

```bash
cd apps/api

# Same commands without the 'db:' prefix
pnpm migration:create
pnpm migration:up
pnpm migration:down
pnpm schema:update
# ... etc
```

# Configuration

The MikroORM CLI is configured through `apps/api/mikro-orm.config.ts`:

```typescript
export default defineConfig({
    driver: PostgreSqlDriver,
    clientUrl: process.env.DATABASE_URL,

    // Entity discovery
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],

    // Migration settings
    migrations: {
        path: './migrations',
        pathTs: './migrations',
        tableName: 'mikro_orm_migrations',
        fileName: (timestamp, name) => `${timestamp}_${slugify(name || 'migration')}`,
        transactional: true,
        allOrNothing: true,
        emit: 'ts',
    },

    // Seeder settings (see Database Seeding (MikroORM CLI) below)
    seeder: {
        path: './dist/migration/seeds',
        pathTs: './src/migration/seeds',
        defaultSeeder: 'DatabaseSeeder',
        emit: 'ts',
    },

    // ...pool, logging, and metadata-cache settings vary by environment
});
```

Connection is a single `DATABASE_URL` (not per-field host/port/user/password variables). `DATABASE_SSL=true` adds `rejectUnauthorized: false` to the driver options for managed Postgres providers that use self-signed certificates.

# Creating Migrations

## Automatic Migration Generation

MikroORM can automatically generate migrations based on entity changes:

```bash
# Generate migration from entity changes
pnpm db:migrate:create

# Or from the API directory
pnpm migration:create
```

This analyzes your entities against the current database schema and creates a migration file with the necessary SQL changes.

## Manual Migration Creation

You can also create empty migrations for custom changes:

```bash
# Create an empty migration
pnpm db:migrate:create --blank

# With a custom name
pnpm db:migrate:create --name="add_user_indexes"
```

## Migration File Structure

Generated migrations are TypeScript files in the `apps/api/migrations/` directory, named `<timestamp>_<slug>.ts`:

```typescript
// 20240919123456_migration.ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20240919123456 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create table "users" ("id" uuid not null default gen_random_uuid(), "email" varchar(100) not null, "created_at" timestamptz not null default current_timestamp, constraint "users_pkey" primary key ("id"));'
        );
        this.addSql('create unique index "users_email_unique" on "users" ("email");');
    }

    async down(): Promise<void> {
        this.addSql('drop index "users_email_unique";');
        this.addSql('drop table "users";');
    }
}
```

# Running Migrations

## Execute Migrations

```bash
# Run all pending migrations
pnpm db:migrate:up

# Run up to (and including) a specific migration
pnpm db:migrate:up --to=Migration20240919123456

# Rollback last migration
pnpm db:migrate:down

# Rollback to a specific migration
pnpm db:migrate:down --to=Migration20240918120000
```

## Check Migration Status

```bash
# List all migrations with status
pnpm db:migrate:list

# Check if migrations are needed
pnpm db:migrate:check

# List pending migrations only
pnpm db:migrate:pending
```

## Fresh Database Setup

```bash
# Drop database and run all migrations
pnpm db:migrate:fresh

# Drop and recreate schema (faster for local development, skips history)
pnpm db:schema:fresh
```

# Database Seeding (MikroORM CLI)

MikroORM ships a generic seeder CLI, configured in `mikro-orm.config.ts` above (`seeder.path`, `seeder.defaultSeeder`). It is scaffolding for MikroORM's own `Seeder` classes and is separate from — and currently unused by — this project's actual data seeding, which runs through the `nestjs-command` seed classes under `src/migration/seeds/` (see [Seeding](./seeding.md)).

The scaffolding commands still work if you choose to add a MikroORM-native seeder. Only `seeder:create` has a root-level alias — `seeder:run` must be run from the API directory:

```bash
# Create a new seeder class in seeder.pathTs
pnpm db:seed:create UserSeeder

# Run the configured default seeder (or --class to pick one)
cd apps/api
pnpm seeder:run
pnpm seeder:run --class="UserSeeder"
```

Note that `pnpm db:seed` (root) and `pnpm --filter api migrate:seed` are a different, unrelated command — they run this project's actual `nestjs-command` seeds (see [Seeding](./seeding.md)), not the MikroORM seeder above.

A generated seeder looks like:

```typescript
// UserSeeder.ts
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

export class UserSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        // Insert rows with em.create(...) / em.persist(...); call em.flush() at the end.
    }
}
```

# Environment Configuration

Set these environment variables for the database connection:

```env
# PostgreSQL connection (single URL, not per-field host/port/user/password)
DATABASE_URL=postgresql://postgres:password@localhost:5432/eccho
DATABASE_SSL=false
DATABASE_DEBUG=true

# Application environment
NODE_ENV=development
APP_ENV=development  # cli.ts sets this to 'migration' while running seed commands
```

## Environment-Specific Behavior

- **Development** (`NODE_ENV !== 'production'`): query debug logging enabled, metadata cache disabled.
- **Production** (`NODE_ENV === 'production'`): query debug logging disabled, metadata cache enabled (file-backed).
- **Migration** (`APP_ENV === 'migration'`, set automatically while seed commands run): a larger connection pool (`max: 20`) tuned for bulk operations, versus the app's default pool (`max: 10`).

# Examples

## Migration Example

Creating a migration to add indexes to the User entity:

```typescript
// 20240919150000_migration.ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20240919150000 extends Migration {
    async up(): Promise<void> {
        // Add index on email for faster lookups
        this.addSql('create index "users_email_index" on "users" ("email");');

        // Add composite index for soft-delete queries
        this.addSql(
            'create index "users_deleted_created_at_index" on "users" ("deleted", "created_at");'
        );

        // Add index on the role foreign key
        this.addSql('create index "users_role_id_index" on "users" ("role_id");');
    }

    async down(): Promise<void> {
        this.addSql('drop index "users_role_id_index";');
        this.addSql('drop index "users_deleted_created_at_index";');
        this.addSql('drop index "users_email_index";');
    }
}
```

## Seeder Example

A MikroORM-native seeder (see [Database Seeding (MikroORM CLI)](#database-seeding-mikroorm-cli)) with existence checks before writing:

```typescript
// RoleSeeder.ts
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { RoleEntity } from '../src/modules/role/repository/entities/role.entity';

export class RoleSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const roles = [
            { name: 'superadmin', permissions: ['*'] },
            { name: 'admin', permissions: ['user:read', 'user:write', 'role:read'] },
        ];

        for (const roleData of roles) {
            const existing = await em.findOne(RoleEntity, { name: roleData.name });
            if (existing) continue;
            em.create(RoleEntity, roleData);
        }

        await em.flush();
    }
}
```

# Best Practices

## Migration Best Practices

1. **Review Generated Migrations**: always review auto-generated migrations before running them.
2. **Backup Before Migration**: always back up production databases before running migrations.
3. **Test Migrations**: test migrations in a staging environment first.
4. **Rollback Plan**: make sure every `up()` has a corresponding, working `down()`.

## Example Commands for Different Scenarios

```bash
# Development workflow
pnpm db:schema:update       # Update schema during development

# Production deployment
pnpm db:migrate:check       # Check if migrations are needed
pnpm db:migrate:up          # Run pending migrations

# Reset a local database
pnpm db:schema:fresh        # Drop and recreate schema
pnpm db:seed                # Repopulate with seed data — see Seeding
```
