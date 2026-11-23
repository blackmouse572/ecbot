import { Migration } from '@mikro-orm/migrations';

// Sales, Marketing and Developer permissions as WORKSPACE_DEFAULT_MEMBER_ROLES
// holds them when this was written (Manager is backfilled from Admin).
const SALES_PERMISSIONS = `[
    {"action": ["manage"], "subject": "CONVERSATION"},
    {"action": ["manage"], "subject": "CUSTOMER"},
    {"action": ["manage"], "subject": "ORDER"},
    {"action": ["read"], "subject": "CHATBOT"}
]`;
const MARKETING_PERMISSIONS = `[
    {"action": ["manage"], "subject": "MARKETING"},
    {"action": ["read"], "subject": "CONVERSATION"},
    {"action": ["read"], "subject": "CUSTOMER"},
    {"action": ["read"], "subject": "ORDER"}
]`;
const DEVELOPER_PERMISSIONS = `[
    {"action": ["manage"], "subject": "CHATBOT"},
    {"action": ["manage"], "subject": "KNOWLEDGE_BASE"},
    {"action": ["manage"], "subject": "RAG"},
    {"action": ["manage"], "subject": "TOOL"},
    {"action": ["manage"], "subject": "SKILL"},
    {"action": ["manage"], "subject": "CLIENT_CREDENTIAL"},
    {"action": ["read"], "subject": "TOKEN_USAGE"},
    {"action": ["read"], "subject": "CONVERSATION"},
    {"action": ["read"], "subject": "CUSTOMER"}
]`;

const DESCRIPTIONS = {
    Manager:
        'Runs the workspace day to day. Everything except channels, roles, invitations and billing.',
    Sales: 'Chats with customers, keeps customer details and takes orders.',
    Marketing:
        'Runs marketing: overview, audiences, sends and customer sources. Views conversations, customers and orders.',
    Developer:
        'Builds agents, knowledge, tools, skills and API keys. Views conversations and customers to check replies.',
};

/**
 * The workspace role set becomes Owner, Manager, Sales, Marketing, Developer.
 *
 * 1. Conversations moved from CHATBOT to CONVERSATION, orders from CUSTOMER to
 *    ORDER, marketing from CUSTOMER to MARKETING. Every workspace role (custom
 *    ones too) gets the new subject with the actions it held on the old one,
 *    so nobody loses access. The new built-in roles are left out, so running
 *    this again does not widen them.
 * 2. Built-in Admin is renamed Manager (it keeps its members).
 * 3. Built-in Member is renamed Sales and takes the Sales permissions. Its
 *    members lose agent, knowledge and RAG editing.
 * 4. Marketing and Developer are added to every workspace that has no role of
 *    that name yet.
 */
export class Migration20261122180000_workspace_default_roles extends Migration {
    override async up(): Promise<void> {
        for (const [from, to] of [
            ['CHATBOT', 'CONVERSATION'],
            ['CUSTOMER', 'ORDER'],
            ['CUSTOMER', 'MARKETING'],
        ]) {
            this.addSql(`
                update "roles"
                   set "permissions" = "permissions" || (
                       select coalesce(jsonb_agg(jsonb_build_object(
                                  'subject', '${to}',
                                  'action', p->'action')), '[]'::jsonb)
                         from jsonb_array_elements("roles"."permissions") as p
                        where p->>'subject' = '${from}')
                 where "workspace_id" is not null
                   and not ("type" = 'WORKSPACE_MEMBER'
                            and "name" in ('Sales', 'Marketing', 'Developer'))
                   and "permissions" @> '[{"subject": "${from}"}]'::jsonb
                   and not ("permissions" @> '[{"subject": "${to}"}]'::jsonb);
            `);
        }

        // Rename only where the workspace has no role with the new name yet.
        for (const [from, to] of [
            ['Admin', 'Manager'],
            ['Member', 'Sales'],
        ] as const) {
            this.addSql(`
                update "roles" r
                   set "name" = '${to}',
                       "description" = '${DESCRIPTIONS[to]}'${
                           to === 'Sales'
                               ? `,
                       "permissions" = '${SALES_PERMISSIONS}'::jsonb`
                               : ''
                       }
                 where r."type" = 'WORKSPACE_MEMBER'
                   and r."name" = '${from}'
                   and r."workspace_id" is not null
                   and not exists (
                       select 1 from "roles" o
                        where o."workspace_id" = r."workspace_id"
                          and o."name" = '${to}');
            `);
        }

        for (const [name, permissions] of [
            ['Marketing', MARKETING_PERMISSIONS],
            ['Developer', DEVELOPER_PERMISSIONS],
        ] as const) {
            this.addSql(`
                insert into "roles" ("id", "name", "description", "is_active", "type", "permissions", "workspace_id", "created_at")
                select gen_random_uuid(), '${name}', '${DESCRIPTIONS[name]}', true,
                       'WORKSPACE_MEMBER', '${permissions}'::jsonb, w."id", now()
                  from "workspaces" w
                 where not exists (
                       select 1 from "roles" r
                        where r."workspace_id" = w."id" and r."name" = '${name}');
            `);
        }
    }

    override async down(): Promise<void> {
        // Data migration: the old Member permissions and which grants were
        // added here cannot be told apart from later edits, so it stays.
    }
}
