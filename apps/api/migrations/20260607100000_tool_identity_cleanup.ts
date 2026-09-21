import { Migration } from '@mikro-orm/migrations';

export class Migration20260607100000_tool_identity_cleanup extends Migration {
    // tools.status is a text column with a check constraint (not a PG enum type).
    // Check constraints can be altered inside a transaction.

    override async up(): Promise<void> {
        // Step 1: drop the old check constraint so we can widen the allowed values.
        // PostgreSQL auto-names unnamed inline checks as <table>_<column>_check.
        this.addSql(
            `ALTER TABLE tools DROP CONSTRAINT IF EXISTS tools_status_check;`
        );

        // Step 2: promote stale PENDING_AUTH rows to NEEDS_REAUTH before the new
        // constraint is applied (PENDING_AUTH will no longer be a valid value).
        this.addSql(
            `UPDATE tools SET status = 'NEEDS_REAUTH' WHERE status = 'PENDING_AUTH';`
        );

        // Step 3: promote Composio tools that never completed auth to NEEDS_REAUTH.
        this.addSql(`
            UPDATE tools
            SET status = 'NEEDS_REAUTH'
            WHERE mcp_provider = 'COMPOSIO'
              AND (source->>'connectedAccountId') IS NULL
              AND status = 'ACTIVE';
        `);

        // Step 4: add the new check constraint (PENDING_AUTH removed, NEEDS_REAUTH added).
        this.addSql(`
            ALTER TABLE tools
            ADD CONSTRAINT tools_status_check
            CHECK (status IN ('ACTIVE', 'NEEDS_REAUTH', 'EXPIRED', 'REVOKED'));
        `);

        // Step 5: drop legacy columns.
        this.addSql(`ALTER TABLE tools DROP COLUMN IF EXISTS name;`);
        this.addSql(
            `ALTER TABLE tools DROP COLUMN IF EXISTS composio_toolkit;`
        );
    }

    override async down(): Promise<void> {
        // Recreate legacy columns.
        this.addSql(
            `ALTER TABLE tools ADD COLUMN IF NOT EXISTS name varchar(120);`
        );
        this.addSql(`UPDATE tools SET name = display_name WHERE name IS NULL;`);
        this.addSql(`ALTER TABLE tools ALTER COLUMN name SET NOT NULL;`);
        this.addSql(
            `ALTER TABLE tools ADD COLUMN IF NOT EXISTS composio_toolkit varchar(120);`
        );
        this.addSql(
            `UPDATE tools SET composio_toolkit = source->>'toolkit' WHERE mcp_provider = 'COMPOSIO';`
        );

        // Restore old check constraint (PENDING_AUTH back, NEEDS_REAUTH removed).
        // Rows currently in NEEDS_REAUTH fall back to ACTIVE (irreversible data change).
        this.addSql(
            `UPDATE tools SET status = 'ACTIVE' WHERE status = 'NEEDS_REAUTH';`
        );
        this.addSql(
            `ALTER TABLE tools DROP CONSTRAINT IF EXISTS tools_status_check;`
        );
        this.addSql(`
            ALTER TABLE tools
            ADD CONSTRAINT tools_status_check
            CHECK (status IN ('ACTIVE', 'PENDING_AUTH', 'EXPIRED', 'REVOKED'));
        `);
    }
}
