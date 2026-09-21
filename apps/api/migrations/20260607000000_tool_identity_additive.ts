import { Migration } from '@mikro-orm/migrations';

export class Migration20260607000000_tool_identity_additive extends Migration {
    override async up(): Promise<void> {
        // 1. Hard-delete stale install drafts (PENDING_AUTH rows older than 1 hour)
        this.addSql(
            `DELETE FROM tools WHERE status = 'PENDING_AUTH' AND created_at < NOW() - INTERVAL '1 hour';`
        );

        // 2. Add columns (all nullable initially)
        this.addSql(
            `ALTER TABLE tools ADD COLUMN IF NOT EXISTS slug varchar(80);`
        );
        this.addSql(
            `ALTER TABLE tools ADD COLUMN IF NOT EXISTS display_name varchar(120);`
        );
        this.addSql(`ALTER TABLE tools ADD COLUMN IF NOT EXISTS source jsonb;`);

        // 3. Backfill display_name = name
        this.addSql(
            `UPDATE tools SET display_name = name WHERE display_name IS NULL;`
        );

        // 4. Resolve duplicate display_names (workspace-scoped — rename 2nd, 3rd occurrences)
        this.addSql(`
WITH ranked AS (
  SELECT id, workspace_id, display_name,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, display_name ORDER BY created_at ASC) AS rn
  FROM tools
  WHERE deleted = false
)
UPDATE tools t
SET display_name = r.display_name || ' (' || r.rn || ')'
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;
        `);

        // 5. Backfill slug — generate workspace-unique slugs
        // COMPOSIO tools: base = 'composio-' + composio_toolkit
        this.addSql(`
UPDATE tools SET slug = 'composio-' || LOWER(COALESCE(composio_toolkit, 'unknown'))
WHERE mcp_provider = 'COMPOSIO' AND slug IS NULL;
        `);

        // OPERATOR and HTTP tools: base = slugified display_name (lowercase, hyphens)
        this.addSql(`
UPDATE tools SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9\\s-]', '', 'g'), '[\\s_]+', '-', 'g'))
WHERE mcp_provider != 'COMPOSIO' AND slug IS NULL;
        `);

        // Also handle kind = HTTP tools (kind column, not mcp_provider)
        this.addSql(`
UPDATE tools SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9\\s-]', '', 'g'), '[\\s_]+', '-', 'g'))
WHERE mcp_provider IS NULL AND slug IS NULL;
        `);

        // Deduplicate slugs within workspace: suffix -2, -3, etc.
        this.addSql(`
WITH ranked AS (
  SELECT id, workspace_id, slug,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, slug ORDER BY created_at ASC) AS rn
  FROM tools
  WHERE deleted = false AND slug IS NOT NULL
)
UPDATE tools t
SET slug = r.slug || '-' || r.rn
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;
        `);

        // 6. Backfill source per mcp_provider
        // COMPOSIO
        this.addSql(`
UPDATE tools SET source = jsonb_build_object('kind', 'COMPOSIO', 'toolkit', COALESCE(composio_toolkit, ''), 'connectedAccountId', null, 'authConfigId', null)
WHERE mcp_provider = 'COMPOSIO' AND source IS NULL;
        `);

        // OPERATOR
        this.addSql(`
UPDATE tools SET source = jsonb_build_object('kind', 'OPERATOR', 'serverUrl', COALESCE(mcp_server_url, ''))
WHERE mcp_provider = 'OPERATOR' AND source IS NULL;
        `);

        // HTTP (kind = 'HTTP')
        this.addSql(`
UPDATE tools SET source = jsonb_build_object('kind', 'HTTP')
WHERE kind = 'HTTP' AND source IS NULL;
        `);

        // 7. Add NOT NULL constraints and UNIQUE (only after all rows are backfilled)
        this.addSql(`ALTER TABLE tools ALTER COLUMN slug SET NOT NULL;`);
        this.addSql(
            `ALTER TABLE tools ALTER COLUMN display_name SET NOT NULL;`
        );

        // PostgreSQL < 15 doesn't support ADD CONSTRAINT IF NOT EXISTS — use DO block
        this.addSql(`
DO $$ BEGIN
  ALTER TABLE tools ADD CONSTRAINT tools_slug_per_workspace_unique UNIQUE (workspace_id, slug);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
        `);

        // 8. Create tool_install_sessions table
        this.addSql(`
CREATE TABLE IF NOT EXISTS tool_install_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz,
  updated_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  draft_display_name varchar(120) NOT NULL,
  draft_source jsonb NOT NULL,
  draft_config jsonb,
  expires_at timestamptz NOT NULL
);
        `);

        this.addSql(
            `CREATE INDEX IF NOT EXISTS tool_install_sessions_workspace_id_idx ON tool_install_sessions(workspace_id);`
        );
        this.addSql(
            `CREATE INDEX IF NOT EXISTS tool_install_sessions_expires_at_idx ON tool_install_sessions(expires_at);`
        );
        this.addSql(
            `CREATE INDEX IF NOT EXISTS tool_install_sessions_deleted_idx ON tool_install_sessions(deleted);`
        );
        this.addSql(
            `CREATE INDEX IF NOT EXISTS tool_install_sessions_created_at_idx ON tool_install_sessions(created_at);`
        );
    }

    override async down(): Promise<void> {
        // 1. DROP TABLE tool_install_sessions
        this.addSql(`DROP TABLE IF EXISTS tool_install_sessions;`);

        // 2. DROP CONSTRAINT tools_slug_per_workspace_unique
        this.addSql(
            `ALTER TABLE tools DROP CONSTRAINT IF EXISTS tools_slug_per_workspace_unique;`
        );

        // 3. DROP columns slug, display_name, source
        // Note: renamed display_names cannot be unscrambled; only the columns are dropped
        this.addSql(
            `ALTER TABLE tools DROP COLUMN IF EXISTS slug, DROP COLUMN IF EXISTS display_name, DROP COLUMN IF EXISTS source;`
        );
    }
}
