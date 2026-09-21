import { Migration } from '@mikro-orm/migrations';

export class Migration20260528000000_conversation_bot_enabled extends Migration {
    override async up(): Promise<void> {
        // Split "who replies" (bot vs operator) from lifecycle status.
        this.addSql(
            `alter table "conversations" add column if not exists "bot_enabled" boolean not null default true;`
        );

        // Previously-paused conversations were operator-handled → bot off.
        this.addSql(
            `update "conversations" set "bot_enabled" = false where "status" = 'PAUSED';`
        );

        // Collapse AUTO/PAUSED into the single OPEN lifecycle state.
        this.addSql(
            `alter table "conversations" drop constraint if exists "conversations_status_check";`
        );
        this.addSql(
            `update "conversations" set "status" = 'OPEN' where "status" in ('AUTO', 'PAUSED');`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_status_check" check("status" in ('OPEN', 'RESOLVED'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "conversations" drop constraint if exists "conversations_status_check";`
        );

        // OPEN + bot off → PAUSED; remaining OPEN → AUTO.
        this.addSql(
            `update "conversations" set "status" = 'PAUSED' where "status" = 'OPEN' and "bot_enabled" = false;`
        );
        this.addSql(
            `update "conversations" set "status" = 'AUTO' where "status" = 'OPEN';`
        );

        this.addSql(
            `alter table "conversations" add constraint "conversations_status_check" check("status" in ('AUTO', 'PAUSED', 'RESOLVED'));`
        );
        this.addSql(
            `alter table "conversations" drop column if exists "bot_enabled";`
        );
    }
}
