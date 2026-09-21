import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { MigrationModule } from 'src/migration/migration.module';

async function bootstrap() {
    // This entrypoint runs `nestjs-command` commands (seeds, the account-token
    // backfill, the template migration, ...). Of these, only `seed:*`/`remove:*`
    // insert or delete demo data, so only those are blocked in production;
    // operational commands like the token backfill must be able to run there.
    // APP_ENV is the real deployment switch (app.config.ts); NODE_ENV is not set
    // in the deployed environments, so checking it alone is vacuous there.
    const DEMO_DATA_COMMAND = /^(seed|remove):/;
    const command = process.argv[2] ?? '';
    const isProduction =
        process.env.NODE_ENV === 'production' ||
        process.env.APP_ENV === 'production';
    if (isProduction && DEMO_DATA_COMMAND.test(command)) {
        console.error(
            `Refusing to run "${command}" in production (NODE_ENV or APP_ENV): seed/remove commands insert or delete demo data.`
        );
        process.exit(1);
    }

    process.env.APP_ENV = ENUM_APP_ENVIRONMENT.MIGRATION;

    const app = await NestFactory.createApplicationContext(MigrationModule, {
        logger: ['error', 'fatal'],
        abortOnError: true,
        bufferLogs: false,
    });

    const logger = new Logger('NestJs-Seed');

    try {
        await app.select(CommandModule).get(CommandService).exec();
        process.exit(0);
    } catch (err: unknown) {
        logger.error(err);

        process.exit(1);
    }
}

bootstrap();
