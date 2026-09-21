import { Migration } from '@mikro-orm/migrations';

export class Migration20251122104805 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "accounts" add column "chatbot_id" uuid null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `create table "chatbots_accounts" ("chatbot_entity_id" uuid not null, "account_entity_id" uuid not null, constraint "chatbots_accounts_pkey" primary key ("chatbot_entity_id", "account_entity_id"));`
        );

        this.addSql(
            `create table "accounts_chatbots" ("account_entity_id" uuid not null, "chatbot_entity_id" uuid not null, constraint "accounts_chatbots_pkey" primary key ("account_entity_id", "chatbot_entity_id"));`
        );

        this.addSql(
            `alter table "chatbots_accounts" add constraint "chatbots_accounts_chatbot_entity_id_foreign" foreign key ("chatbot_entity_id") references "chatbots" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "chatbots_accounts" add constraint "chatbots_accounts_account_entity_id_foreign" foreign key ("account_entity_id") references "accounts" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "accounts_chatbots" add constraint "accounts_chatbots_account_entity_id_foreign" foreign key ("account_entity_id") references "accounts" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "accounts_chatbots" add constraint "accounts_chatbots_chatbot_entity_id_foreign" foreign key ("chatbot_entity_id") references "chatbots" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "accounts" drop constraint "accounts_chatbot_id_foreign";`
        );

        this.addSql(`alter table "accounts" drop column "chatbot_id";`);
    }
}
