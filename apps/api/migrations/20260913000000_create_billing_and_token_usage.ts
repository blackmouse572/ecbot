import { Migration } from '@mikro-orm/migrations';

/**
 * Plan-based token metering (#78, #79).
 *
 * Adds the billing catalog (`plans`), the per-workspace allowance
 * (`workspace_subscriptions`), the top-up ledger (`token_credits`) and the
 * usage ledger (`token_usage`), plus the counters they hang off on `workspaces`
 * and the per-chatbot budget caps on `chatbots`.
 *
 * Ends by seeding a private `free` plan and subscribing every existing
 * workspace to it. Without that, enforcement would go live with every
 * subscription missing, and the guard would silence every chatbot on deploy.
 */
export class Migration20260913000000_create_billing_and_token_usage extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "plans" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "name" varchar(255) not null, "slug" varchar(100) not null, "description" text null, "token_quota" bigint not null, "billing_cycle" text check ("billing_cycle" in ('MONTHLY', 'YEARLY')) not null default 'MONTHLY', "price" int not null default 0, "currency" text check ("currency" in ('USD', 'VND')) not null default 'VND', "is_active" boolean not null default true, "is_public" boolean not null default false, "sort_order" int not null default 0, "features" jsonb null, "external_refs" jsonb null, "sync_status" text check ("sync_status" in ('NOT_SYNCED', 'SYNCED', 'FAILED')) not null default 'NOT_SYNCED', "sync_error" text null, constraint "plans_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "plans" add constraint "plans_slug_unique" unique ("slug");`
        );
        this.addSql(
            `create index "plans_deleted_index" on "plans" ("deleted");`
        );
        this.addSql(
            `create index "plans_created_at_index" on "plans" ("created_at");`
        );
        this.addSql(
            `create index "plans_updated_at_index" on "plans" ("updated_at");`
        );
        this.addSql(
            `create index "plans_deleted_at_index" on "plans" ("deleted_at");`
        );
        this.addSql(
            `create index "plans_is_active_is_public_index" on "plans" ("is_active", "is_public");`
        );

        this.addSql(
            `create table "workspace_subscriptions" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "plan_id" uuid not null, "status" text check ("status" in ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED')) not null default 'ACTIVE', "current_period_start" timestamptz not null, "current_period_end" timestamptz not null, "token_quota" bigint not null, "token_used_in_period" bigint not null default 0, "external_subscription_id" varchar(255) null, "cancel_at_period_end" boolean not null default false, constraint "workspace_subscriptions_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "workspace_subscriptions" add constraint "workspace_subscriptions_workspace_id_unique" unique ("workspace_id");`
        );
        this.addSql(
            `create index "workspace_subscriptions_deleted_index" on "workspace_subscriptions" ("deleted");`
        );
        this.addSql(
            `create index "workspace_subscriptions_created_at_index" on "workspace_subscriptions" ("created_at");`
        );
        this.addSql(
            `create index "workspace_subscriptions_updated_at_index" on "workspace_subscriptions" ("updated_at");`
        );
        this.addSql(
            `create index "workspace_subscriptions_deleted_at_index" on "workspace_subscriptions" ("deleted_at");`
        );
        this.addSql(
            `create index "workspace_subscriptions_status_current_period_end_index" on "workspace_subscriptions" ("status", "current_period_end");`
        );

        this.addSql(
            `create table "token_credits" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "amount" bigint not null, "note" varchar(500) null, constraint "token_credits_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "token_credits_deleted_index" on "token_credits" ("deleted");`
        );
        this.addSql(
            `create index "token_credits_created_at_index" on "token_credits" ("created_at");`
        );
        this.addSql(
            `create index "token_credits_updated_at_index" on "token_credits" ("updated_at");`
        );
        this.addSql(
            `create index "token_credits_deleted_at_index" on "token_credits" ("deleted_at");`
        );
        this.addSql(
            `create index "token_credits_workspace_id_created_at_index" on "token_credits" ("workspace_id", "created_at");`
        );

        this.addSql(
            `create table "token_usage" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "chatbot_id" uuid null, "account_id" uuid null, "platform" text check ("platform" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP', 'TELEGRAM_BOT', 'API_CHANNEL', 'WEBSITE_WIDGET')) null, "source" text check ("source" in ('PLATFORM_REPLY', 'FOLLOWUP', 'WIDGET', 'PREVIEW')) not null, "model" varchar(255) null, "input_tokens" bigint not null default 0, "output_tokens" bigint not null default 0, "total_tokens" bigint not null default 0, "conversation_id" uuid null, constraint "token_usage_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "token_usage_deleted_index" on "token_usage" ("deleted");`
        );
        this.addSql(
            `create index "token_usage_created_at_index" on "token_usage" ("created_at");`
        );
        this.addSql(
            `create index "token_usage_updated_at_index" on "token_usage" ("updated_at");`
        );
        this.addSql(
            `create index "token_usage_deleted_at_index" on "token_usage" ("deleted_at");`
        );
        this.addSql(
            `create index "token_usage_workspace_id_created_at_index" on "token_usage" ("workspace_id", "created_at");`
        );
        this.addSql(
            `create index "token_usage_workspace_id_chatbot_id_created_at_index" on "token_usage" ("workspace_id", "chatbot_id", "created_at");`
        );

        for (const table of [
            'plans',
            'workspace_subscriptions',
            'token_credits',
            'token_usage',
        ]) {
            for (const column of ['created_by', 'updated_by', 'deleted_by']) {
                this.addSql(
                    `alter table "${table}" add constraint "${table}_${column}_id_foreign" foreign key ("${column}_id") references "users" ("id") on update cascade on delete set null;`
                );
            }
        }

        this.addSql(
            `alter table "workspace_subscriptions" add constraint "workspace_subscriptions_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "workspace_subscriptions" add constraint "workspace_subscriptions_plan_id_foreign" foreign key ("plan_id") references "plans" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "token_credits" add constraint "token_credits_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "token_usage" add constraint "token_usage_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        // Usage history must outlive the chatbot or channel it came from: the
        // tokens were spent either way, so the reference nulls rather than
        // cascading the row away.
        this.addSql(
            `alter table "token_usage" add constraint "token_usage_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "token_usage" add constraint "token_usage_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "workspaces" add column "token_credit_balance" bigint not null default 0, add column "low_balance_threshold" int null, add column "low_balance_notified_at" timestamptz null;`
        );
        this.addSql(
            `alter table "chatbots" add column "daily_token_cap" bigint null, add column "monthly_token_cap" bigint null;`
        );

        // Column comments the entities declare. Omitting them leaves the ORM
        // seeing permanent drift and re-emitting them on every migration:create.
        for (const [table, column, comment] of [
            ['plans', 'token_quota', 'Tokens granted per billing cycle'],
            [
                'plans',
                'price',
                'Price in the currency minor unit (cents / đồng)',
            ],
            ['plans', 'is_public', 'Listed on the public pricing page'],
            [
                'plans',
                'external_refs',
                'Payment-provider catalog ids, keyed by provider',
            ],
            ['token_credits', 'amount', 'Tokens granted (always positive)'],
        ] as const) {
            this.addSql(
                `comment on column "${table}"."${column}" is '${comment.replace(/'/g, "''")}';`
            );
        }

        // ENUM_POLICY_SUBJECT gained TOKEN_USAGE and PLAN. The activities table
        // constrains `subject` to that enum, so without widening it here every
        // activity logged against the new subjects would fail the check —
        // same drift the WAITLIST migration fixed.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST', 'TOKEN_USAGE', 'PLAN'));`
        );

        // Bootstrap: a private free plan, and every existing workspace on it.
        // Deploying enforcement without this would leave every workspace with
        // no subscription, which the guard reads as "inactive" and mutes.
        this.addSql(
            `insert into "plans" ("name", "slug", "description", "token_quota", "billing_cycle", "price", "currency", "is_active", "is_public", "sort_order")
             values ('Free', 'free', 'Bootstrap plan assigned to workspaces that predate billing.', 1000000, 'MONTHLY', 0, 'VND', true, false, 0)
             on conflict ("slug") do nothing;`
        );
        this.addSql(
            `insert into "workspace_subscriptions" ("workspace_id", "plan_id", "status", "current_period_start", "current_period_end", "token_quota", "token_used_in_period")
             select w."id", p."id", 'ACTIVE', now(), now() + interval '1 month', p."token_quota", 0
               from "workspaces" w
               cross join (select "id", "token_quota" from "plans" where "slug" = 'free') p
              where not exists (
                    select 1 from "workspace_subscriptions" s where s."workspace_id" = w."id"
              );`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST'));`
        );
        this.addSql(
            `alter table "chatbots" drop column if exists "daily_token_cap", drop column if exists "monthly_token_cap";`
        );
        this.addSql(
            `alter table "workspaces" drop column if exists "token_credit_balance", drop column if exists "low_balance_threshold", drop column if exists "low_balance_notified_at";`
        );
        this.addSql(`drop table if exists "token_usage" cascade;`);
        this.addSql(`drop table if exists "token_credits" cascade;`);
        this.addSql(`drop table if exists "workspace_subscriptions" cascade;`);
        this.addSql(`drop table if exists "plans" cascade;`);
    }
}
