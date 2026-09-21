import { Migration } from '@mikro-orm/migrations';

export class Migration20260513000000_MakeAccountsChatbotNullable extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "accounts" drop constraint "accounts_chatbot_id_foreign";`
        );
        this.addSql(
            `alter table "accounts" alter column "chatbot_id" drop not null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "accounts" drop constraint "accounts_chatbot_id_foreign";`
        );
        this.addSql(`delete from "accounts" where "chatbot_id" is null;`);
        this.addSql(
            `alter table "accounts" alter column "chatbot_id" set not null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
    }
}
