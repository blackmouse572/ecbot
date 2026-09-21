import { Migration } from '@mikro-orm/migrations';

export class Migration20260728045745_backfill_chatbot_model_id extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `update "chatbots" set "model_text_name" = "model_provider" || '/' || "model_text_name" where "model_text_name" not like '%/%';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `update "chatbots" set "model_text_name" = split_part("model_text_name", '/', 2) where "model_text_name" like '%/%';`
        );
    }
}
