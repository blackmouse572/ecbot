import { Migration } from '@mikro-orm/migrations';

/**
 * Backfill the permission rows that `token_usage` needs, and repair workspaces
 * that never got an owner role.
 *
 * A role's `permissions` array is a snapshot frozen when the role was created —
 * it is never re-derived from `ALLOWED_*_POLICY_SUBJECT`. So adding TOKEN_USAGE
 * to those constants only affects roles created from now on; every existing
 * role has to be amended here, or the Usage page stays invisible to everyone.
 *
 * The second half fixes older breakage this surfaced: a handful of workspaces
 * predate `createWorkspaceOwnerRole` and have neither an owner role nor a
 * membership row for their owner. Their owner resolves to a bare USER role with
 * no permissions, so CASL grants them nothing at all — not just Usage, but
 * every ability-gated screen in the workspace.
 */
export class Migration20260914000000_sync_token_usage_permissions extends Migration {
    override async up(): Promise<void> {
        // --- 1. TOKEN_USAGE for existing workspace owner + workspace admin roles.
        // Matched by name for the admin role because `type` is WORKSPACE_MEMBER
        // for every non-owner role — the distinction is the role name, set from
        // WORKSPACE_DEFAULT_MEMBER_ROLES.
        this.addSql(`
            update "roles"
               set "permissions" = "permissions" || '[{"action": ["manage"], "subject": "TOKEN_USAGE"}]'::jsonb
             where ("type" = 'WORKSPACE_OWNER' or "name" = 'Admin')
               and "workspace_id" is not null
               and not ("permissions"::text like '%TOKEN_USAGE%');
        `);

        // --- 2. TOKEN_USAGE + PLAN for the global admin role (the admin portal
        // gates /plans and /token-usage on these subjects).
        this.addSql(`
            update "roles"
               set "permissions" = "permissions" || '[{"action": ["manage"], "subject": "TOKEN_USAGE"}]'::jsonb
             where "type" = 'ADMIN' and "workspace_id" is null
               and not ("permissions"::text like '%TOKEN_USAGE%');
        `);
        this.addSql(`
            update "roles"
               set "permissions" = "permissions" || '[{"action": ["manage"], "subject": "PLAN"}]'::jsonb
             where "type" = 'ADMIN' and "workspace_id" is null
               and not ("permissions"::text like '%"PLAN"%');
        `);

        // --- 3. Owner role for workspaces that never got one. Subject list
        // mirrors ALLOWED_WORKSPACE_POLICY_SUBJECT at the time of writing.
        this.addSql(`
            insert into "roles" ("id", "name", "description", "is_active", "type", "permissions", "workspace_id", "created_at")
            select gen_random_uuid(),
                   left('Owner - ' || w."name", 300),
                   'Owner role for ' || w."name" || ' workspace with full permissions',
                   true,
                   'WORKSPACE_OWNER',
                   '[{"action":["manage"],"subject":"ACTIVITY"},
                     {"action":["manage"],"subject":"UTILITIES"},
                     {"action":["manage"],"subject":"DASHBOARD"},
                     {"action":["manage"],"subject":"WORKSPACE"},
                     {"action":["manage"],"subject":"USER"},
                     {"action":["manage"],"subject":"MEMBER"},
                     {"action":["manage"],"subject":"CHATBOT"},
                     {"action":["manage"],"subject":"RAG"},
                     {"action":["manage"],"subject":"KNOWLEDGE_BASE"},
                     {"action":["manage"],"subject":"TOOL"},
                     {"action":["manage"],"subject":"CUSTOMER"},
                     {"action":["manage"],"subject":"CLIENT_CREDENTIAL"},
                     {"action":["manage"],"subject":"SKILL"},
                     {"action":["manage"],"subject":"TOKEN_USAGE"}]'::jsonb,
                   w."id",
                   now()
              from "workspaces" w
             where not exists (
                   select 1 from "roles" r
                    where r."workspace_id" = w."id" and r."type" = 'WORKSPACE_OWNER');
        `);

        // --- 4. Membership linking each owner to that role, mirroring what
        // workspace creation does (workspace.owner.service.ts).
        this.addSql(`
            insert into "workspace_members" ("id", "workspace_id", "user_id", "role_id", "joined_at", "is_active", "created_at")
            select gen_random_uuid(), w."id", w."owner_id", r."id", now(), true, now()
              from "workspaces" w
              join "roles" r on r."workspace_id" = w."id" and r."type" = 'WORKSPACE_OWNER'
             where w."owner_id" is not null
               and not exists (
                   select 1 from "workspace_members" m
                    where m."workspace_id" = w."id" and m."user_id" = w."owner_id");
        `);
    }

    override async down(): Promise<void> {
        // Only the permission rows are reversible. The repaired owner roles and
        // memberships are left in place: they are what the app has always been
        // supposed to create, and dropping them would re-break those
        // workspaces rather than restore a meaningful earlier state.
        this.addSql(`
            update "roles"
               set "permissions" = (
                   select coalesce(jsonb_agg(p), '[]'::jsonb)
                     from jsonb_array_elements("permissions") p
                    where p->>'subject' not in ('TOKEN_USAGE', 'PLAN'))
             where "permissions"::text like '%TOKEN_USAGE%'
                or "permissions"::text like '%"PLAN"%';
        `);
    }
}
