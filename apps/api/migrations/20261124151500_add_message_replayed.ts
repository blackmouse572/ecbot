import { Migration } from '@mikro-orm/migrations';

// Marks inbound history imported by reconciliation, which is never answered
// (ADR-0009). The unanswered-message sweep skips these rows.
export class Migration20261124151500_add_message_replayed extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "messages" add column "replayed" boolean not null default false;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "messages" drop column "replayed";`);
    }
}
