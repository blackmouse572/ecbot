import { Migration } from '@mikro-orm/migrations';

export class Migration20261031030000_toolkit_overrides extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
create table "toolkit_overrides" (
  "id" uuid not null default gen_random_uuid(),
  "deleted" boolean not null default false,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "created_by_id" uuid null,
  "updated_at" timestamptz null,
  "updated_by_id" uuid null,
  "deleted_at" timestamptz null,
  "deleted_by_id" uuid null,
  "slug" varchar(80) not null,
  "name" varchar(120) null,
  "description" text null,
  "logo" varchar(500) null,
  "server_url" varchar(500) null,
  "categories" jsonb null,
  "disabled" boolean not null default false,
  constraint "toolkit_overrides_pkey" primary key ("id")
);`);
        this.addSql(
            `alter table "toolkit_overrides" add constraint "toolkit_overrides_slug_unique" unique ("slug");`
        );
        for (const col of [
            'deleted',
            'created_at',
            'updated_at',
            'deleted_at',
        ]) {
            this.addSql(
                `create index "toolkit_overrides_${col}_index" on "toolkit_overrides" ("${col}");`
            );
        }
        for (const col of ['created_by_id', 'updated_by_id', 'deleted_by_id']) {
            this.addSql(
                `alter table "toolkit_overrides" add constraint "toolkit_overrides_${col}_foreign" foreign key ("${col}") references "users" ("id") on update cascade on delete set null;`
            );
        }
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "toolkit_overrides";`);
    }
}
