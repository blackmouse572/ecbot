import { Migration } from '@mikro-orm/migrations';

export class Migration20251122111147 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "chatbots" drop constraint "chatbots_added_by_id_foreign";`
        );

        this.addSql(`drop index "chatbots_added_by_id_index";`);
        this.addSql(`alter table "chatbots" drop column "added_by_id";`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "chatbots" add column "added_by_id" uuid not null;`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_added_by_id_foreign" foreign key ("added_by_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `create index "chatbots_added_by_id_index" on "chatbots" ("added_by_id");`
        );
    }
}
