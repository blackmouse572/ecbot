import { Migration } from '@mikro-orm/migrations';

export class Migration20260418000000_sync_chatbot_model_fields extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "chatbots" add column if not exists "model_provider" text null, add column if not exists "model_text_name" text null, add column if not exists "model_temperature" real not null default 1.0;`
        );

        this.addSql(
            `update "chatbots" set "model_provider" = 'openai' where "model_provider" is null;`
        );
        this.addSql(
            `update "chatbots" set "model_text_name" = 'gpt-4o' where "model_text_name" is null;`
        );

        this.addSql(
            `alter table "chatbots" alter column "model_provider" set not null, alter column "model_text_name" set not null;`
        );

        this.addSql(
            `alter table "chatbots" drop column if exists "model", drop column if exists "temperature";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "chatbots" add column if not exists "model" text null, add column if not exists "temperature" real not null default 0.7;`
        );

        this.addSql(
            `update "chatbots" set "model" = "model_text_name", "temperature" = "model_temperature";`
        );

        this.addSql(
            `alter table "chatbots" alter column "model" set not null;`
        );

        this.addSql(
            `alter table "chatbots" drop column if exists "model_provider", drop column if exists "model_text_name", drop column if exists "model_temperature";`
        );
    }
}
