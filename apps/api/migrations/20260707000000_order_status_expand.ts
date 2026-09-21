import { Migration } from '@mikro-orm/migrations';

export class Migration20260707000000_order_status_expand extends Migration {
    override async up(): Promise<void> {
        // Expand the order lifecycle beyond OPEN/CLOSE. CLOSE is kept for
        // backward-compat with apps/app and the Gemini order schema.
        this.addSql(
            `alter table "orders" drop constraint if exists "orders_status_check";`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_status_check" check("status" in ('OPEN', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'CLOSE'));`
        );

        // Chronological log of status changes surfaced in the admin detail view.
        this.addSql(
            `alter table "orders" add column if not exists "status_history" jsonb not null default '[]';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "orders" drop column if exists "status_history";`
        );

        // Collapse the new states back into CLOSE before restoring the old check.
        this.addSql(
            `update "orders" set "status" = 'CLOSE' where "status" in ('CONFIRMED', 'COMPLETED', 'CANCELLED');`
        );
        this.addSql(
            `alter table "orders" drop constraint if exists "orders_status_check";`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_status_check" check("status" in ('OPEN', 'CLOSE'));`
        );
    }
}
