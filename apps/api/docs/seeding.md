# Overview

This documentation explains the database seeding system used by the API:

- **Seed Modules**: `nestjs-command` classes under `src/migration/seeds/` that populate initial data (API keys, countries, roles, users, email templates, built-in skills)
- **CLI Commands**: `pnpm` scripts that run the seed commands through a dedicated NestJS application context

This document covers seeding only. For MikroORM schema migrations (`db:migrate:*`, `db:schema:*`), see [Migration](./migration.md).

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
- [Modules](#modules)
  - [Migration Module](#migration-module)
  - [Seed Modules](#seed-modules)
- [Running Seeds](#running-seeds)
- [Data Seed](#data-seed)
  - [API Key Seed](#api-key-seed)
  - [Country Seed](#country-seed)
  - [Role Seed](#role-seed)
  - [User Seed](#user-seed)
- [Template Seed](#template-seed)
- [Skill Seed](#skill-seed)
- [Creating Custom Seeds](#creating-custom-seeds)
  - [Testing Seeds](#testing-seeds)

# Modules

## Migration Module

The Migration Module (`src/migration/migration.module.ts`) is the entry point for all seed operations. It imports the modules each seed needs and registers the seed classes as providers:

```typescript
@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        CountryModule,
        EmailModule.register(),
        AuthModule,
        RoleModule,
        UserModule,
        // ...other feature modules the seeds depend on
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationUserSeed,
        MigrationRoleSeed,
        MigrationTemplateSeed,
        MigrationSkillSeed,
        MigrationSkillSmoke,
    ],
    exports: [],
})
export class MigrationModule {}
```

This module is bootstrapped by `src/cli.ts`, which integrates `CommandModule` from `nestjs-command` to expose each `@Command()` as a CLI command:

```typescript
async function bootstrap() {
    // This entrypoint only runs seed commands (`nestjs-command seed:*`);
    // schema migrations go through the mikro-orm CLI and are unaffected.
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run seeds with NODE_ENV=production. Seeds insert demo data.');
        process.exit(1);
    }

    process.env.APP_ENV = ENUM_APP_ENVIRONMENT.MIGRATION;

    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error', 'fatal'],
        abortOnError: true,
        bufferLogs: false,
    });

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (err: unknown) {
        new Logger('NestJs-Seed').error(err);
        process.exit(1);
    }
}
```

Seeds insert demo/well-known data and are never allowed to run against a production database — the guard above refuses to start when `NODE_ENV=production`, regardless of which seed command is requested.

## Seed Modules

Each seed module focuses on one domain area and follows a consistent pattern:

1. An `@Injectable()` class that accepts relevant services via dependency injection.
2. Methods decorated with `@Command()` that execute the seeding operation (`seeds()`) and, where implemented, its cleanup (`remove()`).
3. Registration in `MigrationModule` as a provider so its commands are picked up by `nestjs-command`.

# Running Seeds

```bash
# From the repo root — runs country, apikey, role, and user seeds in order
pnpm db:seed

# Equivalent, filtered directly to the API workspace
pnpm --filter api migrate:seed

# Remove seeded data
pnpm --filter api migrate:remove
```

`migrate:seed` is defined in `apps/api/package.json` and chains the individual commands in dependency order:

```json
"migrate:seed": "nestjs-command seed:country && nestjs-command seed:apikey && nestjs-command seed:role && nestjs-command seed:user"
```

Countries are seeded before users (users reference a country), and roles are seeded before users (users reference a role). All seed commands refuse to run when `NODE_ENV=production` (see [Migration Module](#migration-module) above).

# Data Seed

## API Key Seed

**File**: `src/migration/seeds/migration.api-key.seed.ts`

Seeds the database with API keys for different access levels. Key and secret are **generated at seed time and logged once** — they are not hardcoded and cannot be read back afterwards. Some keys can instead be **pinned** from an existing environment variable, so the value stays reproducible without introducing seed-only config:

| Name                              | Type    | Value                                                                          |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------ |
| Api Key Default Migration          | DEFAULT | generated                                                                       |
| Api Key System Migration           | SYSTEM  | generated                                                                       |
| AI Service System Key Migration    | SYSTEM  | pinned from `AI_SERVICE_API_KEY` + `AI_SERVICE_API_SECRET`, if both are set     |
| Cloud Tasks System Key Migration   | SYSTEM  | pinned from `CLOUD_TASKS_SYSTEM_API_KEY` (`key:secret` form), if set            |
| Web Public Key Migration           | PUBLIC  | generated — shipped in the browser bundle, only reaches `@ApiKeyPublicProtected()` routes |

For a pinned key, if the environment variable is unset the seed falls back to generating a random pair instead. Re-running the seed is safe: an existing key with the same `name` is left untouched and skipped.

Generated values:

- Api Key Default Migration
  - Key: `<generated at seed time>`
  - Secret: `<generated at seed time>`
- Api Key System Migration
  - Key: `<generated at seed time>`
  - Secret: `<generated at seed time>`
- Web Public Key Migration
  - Key: `<generated at seed time>`
  - Secret: `<generated at seed time>`

Commands:

- `seed:apikey` - Creates the API keys above
- `remove:apikey` - Removes all API keys

## Country Seed

**File**: `src/migration/seeds/migration.country.seed.ts`

Seeds the database with country reference data. By default, it adds Indonesia (`ID` / `IDN`, phone code `62`, currency `IDR`, timezone `Asia/Jakarta`). Re-running the seed skips countries that already exist.

Commands:

- `seed:country` - Adds countries
- `remove:country` - Removes all countries

## Role Seed

**File**: `src/migration/seeds/migration.role.seed.ts`

Seeds the database with predefined roles and their permissions:

- `superadmin` - all permissions
- `admin` - all permissions except API key management
- `individual` - standard user role, no default permissions
- `premium` - premium user role, no default permissions
- `business` - business user role, no default permissions

Commands:

- `seed:role` - Creates roles

## User Seed

**File**: `src/migration/seeds/migration.user.seed.ts`

Seeds one default user per role, and creates the matching email verification, activity log, and password-history records for each. Requires the country and role seeds to have run first.

Default seeded users:

- `superadmin@mail.com`
- `admin@mail.com`
- `individual@mail.com`
- `premium@mail.com`
- `business@mail.com`

All with the default password: `aaAA@123`

Commands:

- `seed:user` - Creates users

# Template Seed

**File**: `src/migration/seeds/migration.template.seed.ts`

Unlike the other seed modules, the Template Seed doesn't write database records — it imports and registers the application's transactional email templates with AWS Simple Email Service (SES).

Templates covered include welcome emails, account creation, password change, temporary password, password reset, and email/mobile verification (each stored as a Handlebars `.hbs` file under `src/templates/`).

Commands:

- `migrate:template` - Imports all email templates to AWS SES
- `rollback:template` - Removes all email templates from AWS SES

```bash
pnpm --filter api migrate:template
pnpm --filter api rollback:template
```

# Skill Seed

**File**: `src/migration/seeds/migration.skill.seed.ts`

Seeds the built-in, workspace-agnostic skill templates (`BUILTIN_SKILLS`) used by the chatbot skill library. It is not part of the default `migrate:seed` chain — run it on its own:

```bash
pnpm --filter api seed:skill
```

A separate `smoke:skill` command (`migration.skill.smoke.ts`) exercises the skill clone/attach/admin-CRUD flows end-to-end against a real database and S3 bucket; it's a manual diagnostic, not a data seed.

# Creating Custom Seeds

To create a custom seed module:

1. Create a new file in `src/migration/seeds/` with a meaningful name like `migration.your-entity.seed.ts`.
2. Implement the seed class with the `@Injectable()` decorator.
3. Inject the required services in the constructor.
4. Add `@Command()` methods for the seed (and, if needed, remove) operations.
5. Register the seed class as a provider in `src/migration/migration.module.ts`.
6. Add the new command to the `migrate:seed` (and `migrate:remove`) script chain in `apps/api/package.json`.

Example of a custom seed:

```typescript
import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { YourService } from 'src/modules/your-module/services/your.service';

@Injectable()
export class MigrationYourSeed {
    constructor(private readonly yourService: YourService) {}

    @Command({
        command: 'seed:your-command',
        describe: 'seeds your data',
    })
    async seeds(): Promise<void> {
        try {
            const data = [
                // Your data here
            ];

            await this.yourService.createMany(data);
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    @Command({
        command: 'remove:your-command',
        describe: 'remove your data',
    })
    async remove(): Promise<void> {
        try {
            await this.yourService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }
    }
}
```

Then register it in the `MigrationModule`:

```typescript
@Module({
    // ...imports
    providers: [
        // ...existing seeds
        MigrationYourSeed,
    ],
})
export class MigrationModule {}
```

And wire it into the `apps/api/package.json` script chain:

```json
"migrate:seed": "nestjs-command seed:country && nestjs-command seed:apikey && nestjs-command seed:role && nestjs-command seed:user && nestjs-command seed:your-command"
```

## Testing Seeds

Before committing a new seed, test it directly against your local database (this refuses to run if `NODE_ENV=production`, same as the full chain):

```bash
cd apps/api

# Test seeding the data
npx nestjs-command seed:your-command

# Test removal
npx nestjs-command remove:your-command
```
