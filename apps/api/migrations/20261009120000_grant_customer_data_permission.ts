import { Migration } from '@mikro-orm/migrations';

// Role permissions are stored on each role row, so the new CUSTOMER_DATA
// subject (customer export and erasure) only reaches roles created from now
// on. Grant it to the existing workspace owner roles (isWorkspaceOwnerRole
// checks that an owner role holds every workspace subject) and to the default
// "Admin" role of each workspace. Member roles stay without it.
const TARGET = `(
    "type" = 'WORKSPACE_OWNER'
    or ("type" = 'WORKSPACE_MEMBER' and "name" = 'Admin' and "workspace_id" is not null)
)`;

const SUBJECTS_BEFORE = `'ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST', 'TOKEN_USAGE', 'PLAN'`;
// Same order as ENUM_POLICY_SUBJECT, or migration:check reports a change.
const SUBJECTS_AFTER = SUBJECTS_BEFORE.replace(
    `'CUSTOMER',`,
    `'CUSTOMER', 'CUSTOMER_DATA',`
);

export class Migration20261009120000_grant_customer_data_permission extends Migration {
    override async up(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);
        // Keep the activity subject check in sync with ENUM_POLICY_SUBJECT.
        // NOT VALID: existing rows already pass, so skip the full-table scan.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in (${SUBJECTS_AFTER})) not valid;`
        );
        this.addSql(
            `update "roles"
             set "permissions" = "permissions" || '[{"subject":"CUSTOMER_DATA","action":["manage"]}]'::jsonb
             where ${TARGET}
               and not exists (
                   select 1 from jsonb_array_elements("permissions") p
                   where p->>'subject' = 'CUSTOMER_DATA'
               );`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `update "roles"
             set "permissions" = coalesce((
                 select jsonb_agg(p) from jsonb_array_elements("permissions") p
                 where p->>'subject' <> 'CUSTOMER_DATA'
             ), '[]'::jsonb)
             where "permissions" @> '[{"subject":"CUSTOMER_DATA"}]'::jsonb;`
        );
        // Activity rows are append-only; NOT VALID keeps any existing row.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in (${SUBJECTS_BEFORE})) not valid;`
        );
    }
}
