import { Migration } from '@mikro-orm/migrations';

// Indexes prod had never scanned in its life (pg_stat_user_indexes, Nov 2026):
// the base entity's `deleted` and `updated_at` indexes on every table, plain
// indexes a unique or composite index already covers, and users.last_seen_at.
// Each one cost a write on every insert, and `updated_at` / `last_seen_at`
// change on most updates, which stopped Postgres from updating rows in place
// (HOT). `test/common/database/index-hygiene.spec.ts` keeps them from coming
// back. Every table here is small, so the drops lock for milliseconds.
const DROPPED: [index: string, table: string, column: string][] = [
    ['accounts_deleted_index', 'accounts', 'deleted'],
    ['accounts_updated_at_index', 'accounts', 'updated_at'],
    ['activities_deleted_index', 'activities', 'deleted'],
    ['activities_updated_at_index', 'activities', 'updated_at'],
    ['api_keys_deleted_index', 'api_keys', 'deleted'],
    ['api_keys_updated_at_index', 'api_keys', 'updated_at'],
    [
        'chatbot_knowledge_items_deleted_index',
        'chatbot_knowledge_items',
        'deleted',
    ],
    [
        'chatbot_knowledge_items_updated_at_index',
        'chatbot_knowledge_items',
        'updated_at',
    ],
    ['chatbot_skills_chatbot_id_index', 'chatbot_skills', 'chatbot_id'],
    ['chatbot_skills_deleted_index', 'chatbot_skills', 'deleted'],
    ['chatbot_skills_updated_at_index', 'chatbot_skills', 'updated_at'],
    ['chatbot_tools_chatbot_id_index', 'chatbot_tools', 'chatbot_id'],
    ['chatbot_tools_deleted_index', 'chatbot_tools', 'deleted'],
    ['chatbot_tools_updated_at_index', 'chatbot_tools', 'updated_at'],
    ['chatbots_deleted_index', 'chatbots', 'deleted'],
    ['chatbots_updated_at_index', 'chatbots', 'updated_at'],
    ['client_credentials_deleted_index', 'client_credentials', 'deleted'],
    ['client_credentials_updated_at_index', 'client_credentials', 'updated_at'],
    ['contact_points_deleted_index', 'contact_points', 'deleted'],
    ['contact_points_updated_at_index', 'contact_points', 'updated_at'],
    ['contact_points_workspace_id_index', 'contact_points', 'workspace_id'],
    ['conversation_reads_deleted_index', 'conversation_reads', 'deleted'],
    [
        'conversation_reads_operator_id_index',
        'conversation_reads',
        'operator_id',
    ],
    ['conversation_reads_updated_at_index', 'conversation_reads', 'updated_at'],
    ['conversations_chatbot_id_index', 'conversations', 'chatbot_id'],
    ['conversations_deleted_index', 'conversations', 'deleted'],
    ['conversations_updated_at_index', 'conversations', 'updated_at'],
    ['cookies_deleted_index', 'cookies', 'deleted'],
    ['cookies_updated_at_index', 'cookies', 'updated_at'],
    ['countries_alpha2code_index', 'countries', 'alpha2code'],
    ['countries_alpha3code_index', 'countries', 'alpha3code'],
    ['countries_deleted_index', 'countries', 'deleted'],
    ['countries_updated_at_index', 'countries', 'updated_at'],
    [
        'customer_marketing_states_deleted_index',
        'customer_marketing_states',
        'deleted',
    ],
    [
        'customer_marketing_states_updated_at_index',
        'customer_marketing_states',
        'updated_at',
    ],
    [
        'customer_merge_suggestions_deleted_index',
        'customer_merge_suggestions',
        'deleted',
    ],
    [
        'customer_merge_suggestions_updated_at_index',
        'customer_merge_suggestions',
        'updated_at',
    ],
    [
        'customer_merge_suggestions_workspace_id_index',
        'customer_merge_suggestions',
        'workspace_id',
    ],
    [
        'customer_product_reactions_deleted_index',
        'customer_product_reactions',
        'deleted',
    ],
    [
        'customer_product_reactions_updated_at_index',
        'customer_product_reactions',
        'updated_at',
    ],
    [
        'customer_tag_assignments_customer_id_index',
        'customer_tag_assignments',
        'customer_id',
    ],
    [
        'customer_tag_assignments_deleted_index',
        'customer_tag_assignments',
        'deleted',
    ],
    [
        'customer_tag_assignments_updated_at_index',
        'customer_tag_assignments',
        'updated_at',
    ],
    ['customer_tag_events_deleted_index', 'customer_tag_events', 'deleted'],
    [
        'customer_tag_events_updated_at_index',
        'customer_tag_events',
        'updated_at',
    ],
    ['customer_tags_deleted_index', 'customer_tags', 'deleted'],
    ['customer_tags_updated_at_index', 'customer_tags', 'updated_at'],
    ['customer_tags_workspace_id_index', 'customer_tags', 'workspace_id'],
    ['customers_deleted_index', 'customers', 'deleted'],
    ['customers_updated_at_index', 'customers', 'updated_at'],
    ['database_entity_base_deleted_index', 'database_entity_base', 'deleted'],
    [
        'database_entity_base_updated_at_index',
        'database_entity_base',
        'updated_at',
    ],
    ['facebook_activities_deleted_index', 'facebook_activities', 'deleted'],
    [
        'facebook_activities_updated_at_index',
        'facebook_activities',
        'updated_at',
    ],
    ['followups_deleted_index', 'followups', 'deleted'],
    ['followups_updated_at_index', 'followups', 'updated_at'],
    ['invitations_deleted_index', 'invitations', 'deleted'],
    ['invitations_token_index', 'invitations', 'token'],
    ['invitations_updated_at_index', 'invitations', 'updated_at'],
    [
        'knowledge_base_folders_deleted_index',
        'knowledge_base_folders',
        'deleted',
    ],
    [
        'knowledge_base_folders_updated_at_index',
        'knowledge_base_folders',
        'updated_at',
    ],
    ['knowledge_base_items_deleted_index', 'knowledge_base_items', 'deleted'],
    [
        'knowledge_base_items_knowledge_base_id_index',
        'knowledge_base_items',
        'knowledge_base_id',
    ],
    [
        'knowledge_base_items_updated_at_index',
        'knowledge_base_items',
        'updated_at',
    ],
    ['knowledge_bases_deleted_index', 'knowledge_bases', 'deleted'],
    ['knowledge_bases_updated_at_index', 'knowledge_bases', 'updated_at'],
    ['knowledge_item_tags_deleted_index', 'knowledge_item_tags', 'deleted'],
    [
        'knowledge_item_tags_updated_at_index',
        'knowledge_item_tags',
        'updated_at',
    ],
    ['marketing_audiences_deleted_index', 'marketing_audiences', 'deleted'],
    [
        'marketing_audiences_updated_at_index',
        'marketing_audiences',
        'updated_at',
    ],
    [
        'marketing_audiences_workspace_id_index',
        'marketing_audiences',
        'workspace_id',
    ],
    [
        'marketing_backfill_runs_deleted_index',
        'marketing_backfill_runs',
        'deleted',
    ],
    [
        'marketing_backfill_runs_updated_at_index',
        'marketing_backfill_runs',
        'updated_at',
    ],
    ['marketing_events_deleted_index', 'marketing_events', 'deleted'],
    ['marketing_events_updated_at_index', 'marketing_events', 'updated_at'],
    ['marketing_messages_deleted_index', 'marketing_messages', 'deleted'],
    ['marketing_messages_updated_at_index', 'marketing_messages', 'updated_at'],
    ['marketing_sends_deleted_index', 'marketing_sends', 'deleted'],
    ['marketing_sends_updated_at_index', 'marketing_sends', 'updated_at'],
    ['marketing_settings_deleted_index', 'marketing_settings', 'deleted'],
    ['marketing_settings_updated_at_index', 'marketing_settings', 'updated_at'],
    ['messages_conversation_id_index', 'messages', 'conversation_id'],
    ['messages_deleted_index', 'messages', 'deleted'],
    ['messages_updated_at_index', 'messages', 'updated_at'],
    [
        'notification_push_subscriptions_deleted_index',
        'notification_push_subscriptions',
        'deleted',
    ],
    [
        'notification_push_subscriptions_updated_at_index',
        'notification_push_subscriptions',
        'updated_at',
    ],
    ['notifications_deleted_index', 'notifications', 'deleted'],
    ['notifications_updated_at_index', 'notifications', 'updated_at'],
    ['order_items_deleted_index', 'order_items', 'deleted'],
    ['order_items_updated_at_index', 'order_items', 'updated_at'],
    ['orders_deleted_index', 'orders', 'deleted'],
    ['orders_updated_at_index', 'orders', 'updated_at'],
    ['password_histories_deleted_index', 'password_histories', 'deleted'],
    ['password_histories_updated_at_index', 'password_histories', 'updated_at'],
    ['product_groups_deleted_index', 'product_groups', 'deleted'],
    ['product_groups_updated_at_index', 'product_groups', 'updated_at'],
    ['proxies_deleted_index', 'proxies', 'deleted'],
    ['proxies_updated_at_index', 'proxies', 'updated_at'],
    ['rags_deleted_index', 'rags', 'deleted'],
    ['rags_updated_at_index', 'rags', 'updated_at'],
    ['rags_workspace_id_index', 'rags', 'workspace_id'],
    ['requests_deleted_index', 'requests', 'deleted'],
    ['requests_updated_at_index', 'requests', 'updated_at'],
    ['reset_passwords_deleted_index', 'reset_passwords', 'deleted'],
    ['reset_passwords_token_index', 'reset_passwords', 'token'],
    ['reset_passwords_updated_at_index', 'reset_passwords', 'updated_at'],
    ['roles_deleted_index', 'roles', 'deleted'],
    ['roles_updated_at_index', 'roles', 'updated_at'],
    ['sessions_deleted_index', 'sessions', 'deleted'],
    ['sessions_updated_at_index', 'sessions', 'updated_at'],
    ['skills_deleted_index', 'skills', 'deleted'],
    ['skills_updated_at_index', 'skills', 'updated_at'],
    ['skills_workspace_id_index', 'skills', 'workspace_id'],
    ['tool_install_sessions_deleted_index', 'tool_install_sessions', 'deleted'],
    [
        'tool_install_sessions_updated_at_index',
        'tool_install_sessions',
        'updated_at',
    ],
    ['toolkit_overrides_deleted_index', 'toolkit_overrides', 'deleted'],
    ['toolkit_overrides_updated_at_index', 'toolkit_overrides', 'updated_at'],
    ['tools_deleted_index', 'tools', 'deleted'],
    ['tools_updated_at_index', 'tools', 'updated_at'],
    ['tools_workspace_id_index', 'tools', 'workspace_id'],
    ['tracked_links_deleted_index', 'tracked_links', 'deleted'],
    ['tracked_links_updated_at_index', 'tracked_links', 'updated_at'],
    ['usage_events_deleted_index', 'usage_events', 'deleted'],
    ['usage_events_updated_at_index', 'usage_events', 'updated_at'],
    ['users_deleted_index', 'users', 'deleted'],
    ['users_email_index', 'users', 'email'],
    ['users_last_seen_at_index', 'users', 'last_seen_at'],
    ['users_updated_at_index', 'users', 'updated_at'],
    ['users_username_index', 'users', 'username'],
    ['verifications_deleted_index', 'verifications', 'deleted'],
    ['verifications_updated_at_index', 'verifications', 'updated_at'],
    ['waitlists_deleted_index', 'waitlists', 'deleted'],
    ['waitlists_updated_at_index', 'waitlists', 'updated_at'],
    ['workspace_members_deleted_index', 'workspace_members', 'deleted'],
    ['workspace_members_updated_at_index', 'workspace_members', 'updated_at'],
    [
        'workspace_members_workspace_id_index',
        'workspace_members',
        'workspace_id',
    ],
    ['workspace_usage_deleted_index', 'workspace_usage', 'deleted'],
    ['workspace_usage_updated_at_index', 'workspace_usage', 'updated_at'],
    ['workspace_usage_workspace_id_index', 'workspace_usage', 'workspace_id'],
    ['workspaces_deleted_index', 'workspaces', 'deleted'],
    ['workspaces_slug_index', 'workspaces', 'slug'],
    ['workspaces_updated_at_index', 'workspaces', 'updated_at'],
];

export class Migration20261126100904_drop_unused_indexes extends Migration {
    override async up(): Promise<void> {
        for (const [index] of DROPPED) {
            this.addSql(`drop index if exists "${index}";`);
        }

        // The inbox reads a conversation's newest messages every 5 s. Without
        // this, Postgres walks the global date_sent index and filters out every
        // newer message from other conversations.
        this.addSql(
            `create index "messages_conversation_id_date_sent_index" on "messages" ("conversation_id", "date_sent");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop index "messages_conversation_id_date_sent_index";`);

        for (const [index, table, column] of DROPPED) {
            this.addSql(`create index "${index}" on "${table}" ("${column}");`);
        }
    }
}
