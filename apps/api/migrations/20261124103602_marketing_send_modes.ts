import { Migration } from '@mikro-orm/migrations';

export class Migration20261124103602_marketing_send_modes extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "marketing_sends" add column "name" varchar(120) not null default '', add column "mode" text check ("mode" in ('ONCE', 'AUTO')) not null default 'ONCE', add column "active" boolean not null default true, add column "last_run_day" date null, add column "excluded" jsonb not null default '{}';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "marketing_sends" drop column "name", drop column "mode", drop column "active", drop column "last_run_day", drop column "excluded";`
        );
    }
}
