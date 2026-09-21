import { Migration } from '@mikro-orm/migrations';

/**
 * The columns the billing migration left behind on shared tables.
 *
 * `20260913000000_create_billing_and_token_usage` did two unrelated things: it
 * created the hosted edition's billing tables (`plans`, `workspace_subscriptions`,
 * `token_credits`, `token_usage`), and it widened three shared tables that the
 * open engine genuinely maps — `WorkspaceEntity.tokenCreditBalance` /
 * `lowBalanceThreshold` / `lowBalanceNotifiedAt`, `ChatbotEntity.dailyTokenCap` /
 * `monthlyTokenCap`, and the `activities.subject` check, which must list every
 * member of `ENUM_POLICY_SUBJECT`.
 *
 * That migration now belongs to the enterprise overlay, so this one re-states
 * only the half the open engine needs. Every statement is idempotent: on a
 * database that already ran the original (any hosted deployment) this is a
 * no-op, and it stays a no-op when the overlay links the original back in.
 */
export class Migration20260921000000_token_columns_without_billing_tables extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "workspaces" add column if not exists "token_credit_balance" bigint not null default 0, add column if not exists "low_balance_threshold" int null, add column if not exists "low_balance_notified_at" timestamptz null;`
        );
        this.addSql(
            `alter table "chatbots" add column if not exists "daily_token_cap" bigint null, add column if not exists "monthly_token_cap" bigint null;`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST', 'TOKEN_USAGE', 'PLAN'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "workspaces" drop column if exists "token_credit_balance", drop column if exists "low_balance_threshold", drop column if exists "low_balance_notified_at";`
        );
        this.addSql(
            `alter table "chatbots" drop column if exists "daily_token_cap", drop column if exists "monthly_token_cap";`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST'));`
        );
    }
}
