import { Migration } from '@mikro-orm/migrations';

/**
 * `roles.name` holds `Owner - <workspace name>` (role.service.ts) and
 * `workspaces.name` is varchar(255), so the column has to fit 263 characters —
 * but it was created as varchar(30) and never widened in the open engine.
 *
 * That is why `20260914000000_sync_token_usage_permissions` writes
 * `left('Owner - ' || w."name", 300)`: it was authored against a database where
 * the column was already 300. On a self-hosted install with real workspaces it
 * fails with `value too long for type character varying(30)` and blocks every
 * later migration.
 *
 * The timestamp sorts before `20260914000000` so a fresh install widens first;
 * an existing install gets both as pending and runs them in the same order. The
 * statement is idempotent — re-running it on a varchar(300) column is a no-op.
 */
export class Migration20260913500000_widen_role_name extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "roles" alter column "name" type varchar(300) using ("name"::varchar(300));`
        );
    }

    override async down(): Promise<void> {
        // Truncating keeps the down path runnable on data the widened column
        // allowed; names longer than 30 characters cannot be preserved.
        this.addSql(
            `alter table "roles" alter column "name" type varchar(30) using (left("name", 30));`
        );
    }
}
