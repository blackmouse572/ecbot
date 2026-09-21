import { Migration } from '@mikro-orm/migrations';

export class Migration20251122052924 extends Migration {
    override async up(): Promise<void> {
        // First add columns as nullable with defaults
        this.addSql(
            `alter table "chatbots" add column "primary_language" text null default 'en', add column "defered_language" text null, add column "welcome_message" text null, add column "fallback_message" text null, add column "model" text null default 'gpt-4o', add column "temperature" real not null default 0.7, add column "max_tokens" int null;`
        );

        // Update existing rows with default values
        this.addSql(
            `update "chatbots" set "primary_language" = 'en' where "primary_language" is null;`
        );
        this.addSql(
            `update "chatbots" set "model" = 'gpt-4o' where "model" is null;`
        );

        // Now add NOT NULL constraints
        this.addSql(
            `alter table "chatbots" alter column "primary_language" set not null, alter column "model" set not null;`
        );

        this.addSql(
            `comment on column "chatbots"."defered_language" is 'Language to switch to when user not use primary language (e.g english)';`
        );
        this.addSql(
            `comment on column "chatbots"."welcome_message" is 'Welcome message sent to users when they start a chat';`
        );
        this.addSql(
            `comment on column "chatbots"."fallback_message" is 'Fallback message when the bot cannot answer';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "chatbots" drop column "primary_language", drop column "defered_language", drop column "welcome_message", drop column "fallback_message", drop column "model", drop column "temperature", drop column "max_tokens";`
        );
    }
}
