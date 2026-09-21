import { Migration } from '@mikro-orm/migrations';

export class Migration20251122142025 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "chatbots" drop constraint if exists "chatbots_status_check";`
        );
        this.addSql(
            `alter table "chatbots" drop constraint if exists "chatbots_type_check";`
        );

        this.addSql(
            `alter table "accounts" drop constraint "accounts_chatbot_id_foreign";`
        );

        this.addSql(
            `alter table "chatbots" alter column "status" type varchar(100) using ("status"::varchar(100));`
        );
        this.addSql(
            `alter table "chatbots" alter column "type" type varchar(100) using ("type"::varchar(100));`
        );

        this.addSql(
            `alter table "accounts" alter column "chatbot_id" drop default;`
        );
        this.addSql(
            `alter table "accounts" alter column "chatbot_id" type uuid using ("chatbot_id"::text::uuid);`
        );
        // Delete accounts with null chatbot_id before setting NOT NULL constraint
        this.addSql(`delete from "accounts" where "chatbot_id" is null;`);
        this.addSql(
            `alter table "accounts" alter column "chatbot_id" set not null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "accounts" drop constraint "accounts_chatbot_id_foreign";`
        );

        this.addSql(
            `alter table "chatbots" alter column "status" type text using ("status"::text);`
        );
        this.addSql(
            `alter table "chatbots" alter column "type" type text using ("type"::text);`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_status_check" check("status" in ('active', 'inactive', 'archived'));`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_type_check" check("type" in ('beauty', 'fashion', 'restaurant', 'ecommerce', 'healthcare', 'finance', 'education', 'travel', 'spa', 'fitness', 'automotive', 'real_estate', 'entertainment', 'other'));`
        );

        this.addSql(
            `alter table "accounts" alter column "chatbot_id" drop default;`
        );
        this.addSql(
            `alter table "accounts" alter column "chatbot_id" type uuid using ("chatbot_id"::text::uuid);`
        );
        this.addSql(
            `alter table "accounts" alter column "chatbot_id" drop not null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete set null;`
        );
    }
}
