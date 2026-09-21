import { Migration } from '@mikro-orm/migrations';

export class Migration20251026092034 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "api_keys" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "type" text check ("type" in ('SYSTEM', 'DEFAULT')) not null, "name" varchar(100) not null, "key" varchar(50) not null, "hash" varchar(255) not null, "is_active" boolean not null, "start_date" timestamptz null, "end_date" timestamptz null, constraint "api_keys_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "api_keys_deleted_at_index" on "api_keys" ("deleted_at");`
        );
        this.addSql(
            `create index "api_keys_updated_at_index" on "api_keys" ("updated_at");`
        );
        this.addSql(
            `create index "api_keys_created_at_index" on "api_keys" ("created_at");`
        );
        this.addSql(
            `create index "api_keys_deleted_index" on "api_keys" ("deleted");`
        );
        this.addSql(
            `create index "api_keys_is_active_index" on "api_keys" ("is_active");`
        );
        this.addSql(
            `create index "api_keys_name_index" on "api_keys" ("name");`
        );
        this.addSql(
            `create index "api_keys_type_index" on "api_keys" ("type");`
        );
        this.addSql(
            `alter table "api_keys" add constraint "api_keys_key_unique" unique ("key");`
        );

        this.addSql(
            `create table "countries" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "name" varchar(100) not null, "alpha2code" varchar(2) not null, "alpha3code" varchar(3) not null, "numeric_code" varchar(3) not null, "fips_code" varchar(3) null, "phone_code" jsonb not null, "phone_pattern" varchar(100) null, "continent" varchar(50) null, "time_zone" varchar(100) not null, "currency" varchar(10) not null, "domain" varchar(255) null, constraint "countries_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "countries" add constraint "countries_alpha2code_unique" unique ("alpha2code");`
        );
        this.addSql(
            `alter table "countries" add constraint "countries_alpha3code_unique" unique ("alpha3code");`
        );
        this.addSql(
            `alter table "countries" add constraint "countries_numeric_code_unique" unique ("numeric_code");`
        );
        this.addSql(
            `create index "countries_deleted_at_index" on "countries" ("deleted_at");`
        );
        this.addSql(
            `create index "countries_updated_at_index" on "countries" ("updated_at");`
        );
        this.addSql(
            `create index "countries_created_at_index" on "countries" ("created_at");`
        );
        this.addSql(
            `create index "countries_deleted_index" on "countries" ("deleted");`
        );
        this.addSql(
            `create index "countries_phone_code_index" on "countries" ("phone_code");`
        );
        this.addSql(
            `create index "countries_alpha3code_index" on "countries" ("alpha3code");`
        );
        this.addSql(
            `create index "countries_alpha2code_index" on "countries" ("alpha2code");`
        );
        this.addSql(
            `create index "countries_name_index" on "countries" ("name");`
        );

        this.addSql(
            `create table "database_entity_base" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, constraint "database_entity_base_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "database_entity_base_deleted_at_index" on "database_entity_base" ("deleted_at");`
        );
        this.addSql(
            `create index "database_entity_base_updated_at_index" on "database_entity_base" ("updated_at");`
        );
        this.addSql(
            `create index "database_entity_base_created_at_index" on "database_entity_base" ("created_at");`
        );
        this.addSql(
            `create index "database_entity_base_deleted_index" on "database_entity_base" ("deleted");`
        );

        this.addSql(
            `create table "facebook_activities" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "page_id" varchar(255) not null, "sender_id" varchar(255) not null, "recipient_id" varchar(255) null, "event_type" text check ("event_type" in ('message', 'echo', 'postback', 'account_linking', 'delivery', 'read', 'referral', 'unknown')) not null, "message_id" varchar(255) null, "message_text" text null, "event_payload" jsonb null, "webhook_payload" jsonb null, "processed" boolean not null default false, "processing_error" text null, "processed_at" timestamptz null, "metadata" jsonb null, constraint "facebook_activities_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "facebook_activities_deleted_at_index" on "facebook_activities" ("deleted_at");`
        );
        this.addSql(
            `create index "facebook_activities_updated_at_index" on "facebook_activities" ("updated_at");`
        );
        this.addSql(
            `create index "facebook_activities_created_at_index" on "facebook_activities" ("created_at");`
        );
        this.addSql(
            `create index "facebook_activities_deleted_index" on "facebook_activities" ("deleted");`
        );
        this.addSql(
            `create index "facebook_activities_recipient_id_index" on "facebook_activities" ("recipient_id");`
        );
        this.addSql(
            `create index "facebook_activities_sender_id_index" on "facebook_activities" ("sender_id");`
        );
        this.addSql(
            `create index "facebook_activities_page_id_index" on "facebook_activities" ("page_id");`
        );

        this.addSql(
            `create table "workspaces" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "name" varchar(255) not null, "avatar" varchar(500) null, "slug" varchar(100) not null, "owner_id" uuid not null, "invitation_code" varchar(6) not null, constraint "workspaces_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "workspaces" add constraint "workspaces_slug_unique" unique ("slug");`
        );
        this.addSql(
            `create index "workspaces_deleted_at_index" on "workspaces" ("deleted_at");`
        );
        this.addSql(
            `create index "workspaces_updated_at_index" on "workspaces" ("updated_at");`
        );
        this.addSql(
            `create index "workspaces_created_at_index" on "workspaces" ("created_at");`
        );
        this.addSql(
            `create index "workspaces_deleted_index" on "workspaces" ("deleted");`
        );
        this.addSql(
            `create index "workspaces_owner_id_index" on "workspaces" ("owner_id");`
        );
        this.addSql(
            `create index "workspaces_slug_index" on "workspaces" ("slug");`
        );

        this.addSql(
            `create table "roles" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "name" varchar(30) not null, "description" varchar(500) null, "is_active" boolean not null default true, "type" text check ("type" in ('SUPER_ADMIN', 'ADMIN', 'USER', 'WORKSPACE_OWNER', 'WORKSPACE_MEMBER')) not null, "permissions" jsonb not null, "workspace_id" uuid null, constraint "roles_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "roles_deleted_at_index" on "roles" ("deleted_at");`
        );
        this.addSql(
            `create index "roles_updated_at_index" on "roles" ("updated_at");`
        );
        this.addSql(
            `create index "roles_created_at_index" on "roles" ("created_at");`
        );
        this.addSql(
            `create index "roles_deleted_index" on "roles" ("deleted");`
        );
        this.addSql(
            `create index "roles_is_active_index" on "roles" ("is_active");`
        );
        this.addSql(`create index "roles_type_index" on "roles" ("type");`);
        this.addSql(
            `create index "roles_name_workspace_id_index" on "roles" ("name", "workspace_id");`
        );

        this.addSql(
            `create table "users" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "name" varchar(100) not null, "username" varchar(50) null, "mobile_number_country_id" uuid null, "mobile_number_number" varchar(20) null, "verification_email" boolean null default false, "verification_email_verified_date" timestamptz null, "verification_mobile_number" boolean null default false, "verification_mobile_number_verified_date" timestamptz null, "email" varchar(100) not null, "role_id" uuid not null, "password" varchar(255) not null, "password_expired" timestamptz not null, "password_created" timestamptz not null, "password_attempt" int not null default 0, "sign_up_date" timestamptz not null, "sign_up_from" text check ("sign_up_from" in ('ADMIN', 'PUBLIC', 'SEED')) not null, "salt" varchar(255) not null, "status" text check ("status" in ('ACTIVE', 'INACTIVE', 'BLOCKED')) not null default 'ACTIVE', "photo_bucket" varchar(255) null, "photo_key" varchar(255) null, "photo_completed_url" varchar(255) null, "photo_cdn_url" varchar(255) null, "photo_mime" varchar(255) null, "photo_extension" varchar(255) null, "photo_size" numeric(10,2) null, "gender" text check ("gender" in ('MALE', 'FEMALE')) not null, "country_id" uuid not null, "avatar" varchar(255) null, constraint "users_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "users" add constraint "users_username_unique" unique ("username");`
        );
        this.addSql(
            `alter table "users" add constraint "users_email_unique" unique ("email");`
        );
        this.addSql(
            `create index "users_deleted_at_index" on "users" ("deleted_at");`
        );
        this.addSql(
            `create index "users_updated_at_index" on "users" ("updated_at");`
        );
        this.addSql(
            `create index "users_created_at_index" on "users" ("created_at");`
        );
        this.addSql(
            `create index "users_deleted_index" on "users" ("deleted");`
        );
        this.addSql(`create index "users_email_index" on "users" ("email");`);
        this.addSql(
            `create index "users_username_index" on "users" ("username");`
        );
        this.addSql(`create index "users_name_index" on "users" ("name");`);

        this.addSql(
            `create table "verifications" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "user_id" uuid not null, "to" varchar(255) not null, "type" text check ("type" in ('MOBILE_NUMBER', 'EMAIL')) not null, "otp" varchar(255) not null, "expired_date" timestamptz not null, "verify_date" timestamptz null, "is_active" boolean not null default true, "is_verify" boolean not null default false, "reference" varchar(255) not null, constraint "verifications_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "verifications_deleted_at_index" on "verifications" ("deleted_at");`
        );
        this.addSql(
            `create index "verifications_updated_at_index" on "verifications" ("updated_at");`
        );
        this.addSql(
            `create index "verifications_created_at_index" on "verifications" ("created_at");`
        );
        this.addSql(
            `create index "verifications_deleted_index" on "verifications" ("deleted");`
        );
        this.addSql(
            `create index "verifications_is_verify_index" on "verifications" ("is_verify");`
        );
        this.addSql(
            `create index "verifications_is_active_index" on "verifications" ("is_active");`
        );
        this.addSql(
            `create index "verifications_type_index" on "verifications" ("type");`
        );
        this.addSql(
            `create index "verifications_user_id_index" on "verifications" ("user_id");`
        );

        this.addSql(
            `create table "sessions" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "status" text check ("status" in ('ACTIVE', 'REVOKED')) not null default 'ACTIVE', "revoke_at" timestamptz null, "user_id" uuid not null, "ip" varchar(255) not null, "hostname" varchar(255) not null, "protocol" varchar(255) not null, "original_url" varchar(255) not null, "method" varchar(255) not null, "user_agent" varchar(255) null, "x_forwarded_for" varchar(255) null, "x_forwarded_host" varchar(255) null, "x_forwarded_porto" varchar(255) null, "expired_at" timestamptz not null, constraint "sessions_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "sessions_deleted_at_index" on "sessions" ("deleted_at");`
        );
        this.addSql(
            `create index "sessions_updated_at_index" on "sessions" ("updated_at");`
        );
        this.addSql(
            `create index "sessions_created_at_index" on "sessions" ("created_at");`
        );
        this.addSql(
            `create index "sessions_deleted_index" on "sessions" ("deleted");`
        );
        this.addSql(
            `create index "sessions_expired_at_index" on "sessions" ("expired_at");`
        );
        this.addSql(
            `create index "sessions_user_id_index" on "sessions" ("user_id");`
        );
        this.addSql(
            `create index "sessions_status_index" on "sessions" ("status");`
        );

        this.addSql(
            `create table "reset_passwords" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "user_id" uuid not null, "to" varchar(255) not null, "otp" varchar(6) not null, "token" varchar(20) not null, "type" text check ("type" in ('EMAIL')) not null, "expired_date" timestamptz not null, "reset_date" timestamptz null, "verify_date" timestamptz null, "is_reset" boolean not null default false, "is_active" boolean not null default false, "reference" varchar(255) not null, constraint "reset_passwords_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "reset_passwords" add constraint "reset_passwords_token_unique" unique ("token");`
        );
        this.addSql(
            `create index "reset_passwords_deleted_at_index" on "reset_passwords" ("deleted_at");`
        );
        this.addSql(
            `create index "reset_passwords_updated_at_index" on "reset_passwords" ("updated_at");`
        );
        this.addSql(
            `create index "reset_passwords_created_at_index" on "reset_passwords" ("created_at");`
        );
        this.addSql(
            `create index "reset_passwords_deleted_index" on "reset_passwords" ("deleted");`
        );
        this.addSql(
            `create index "reset_passwords_reference_index" on "reset_passwords" ("reference");`
        );
        this.addSql(
            `create index "reset_passwords_is_active_index" on "reset_passwords" ("is_active");`
        );
        this.addSql(
            `create index "reset_passwords_is_reset_index" on "reset_passwords" ("is_reset");`
        );
        this.addSql(
            `create index "reset_passwords_type_index" on "reset_passwords" ("type");`
        );
        this.addSql(
            `create index "reset_passwords_token_index" on "reset_passwords" ("token");`
        );
        this.addSql(
            `create index "reset_passwords_user_id_index" on "reset_passwords" ("user_id");`
        );

        this.addSql(
            `create table "proxies" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "host" varchar(255) not null, "port" int not null, "status" varchar(100) not null, "protocol" varchar(50) not null, "authed" boolean not null default false, "username" varchar(255) null, "password" varchar(255) null, "added_by_id" uuid null, constraint "proxies_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "proxies_deleted_at_index" on "proxies" ("deleted_at");`
        );
        this.addSql(
            `create index "proxies_updated_at_index" on "proxies" ("updated_at");`
        );
        this.addSql(
            `create index "proxies_created_at_index" on "proxies" ("created_at");`
        );
        this.addSql(
            `create index "proxies_deleted_index" on "proxies" ("deleted");`
        );

        this.addSql(
            `create table "password_histories" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "user_id" uuid not null, "password" varchar(255) not null, "type" text check ("type" in ('SIGN_UP', 'FORGOT', 'TEMPORARY', 'CHANGE')) not null, "expired_at" timestamptz not null, "by_id" uuid not null, constraint "password_histories_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "password_histories_deleted_at_index" on "password_histories" ("deleted_at");`
        );
        this.addSql(
            `create index "password_histories_updated_at_index" on "password_histories" ("updated_at");`
        );
        this.addSql(
            `create index "password_histories_created_at_index" on "password_histories" ("created_at");`
        );
        this.addSql(
            `create index "password_histories_deleted_index" on "password_histories" ("deleted");`
        );
        this.addSql(
            `create index "password_histories_by_id_index" on "password_histories" ("by_id");`
        );
        this.addSql(
            `create index "password_histories_user_id_index" on "password_histories" ("user_id");`
        );

        this.addSql(
            `create table "requests" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "type" text check ("type" in ('JOIN_WORKSPACE', 'CHANGE_CONFIG')) not null, "workspace_id" uuid null, "request_from_id" uuid not null, "request_to_id" uuid not null, "payload" jsonb not null default '{}', "status" text check ("status" in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')) not null default 'PENDING', "reason" varchar(500) null, "processed_by_id" uuid null, constraint "requests_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "requests_deleted_at_index" on "requests" ("deleted_at");`
        );
        this.addSql(
            `create index "requests_updated_at_index" on "requests" ("updated_at");`
        );
        this.addSql(
            `create index "requests_created_at_index" on "requests" ("created_at");`
        );
        this.addSql(
            `create index "requests_deleted_index" on "requests" ("deleted");`
        );
        this.addSql(
            `create index "requests_workspace_id_index" on "requests" ("workspace_id");`
        );
        this.addSql(
            `create index "requests_status_index" on "requests" ("status");`
        );
        this.addSql(
            `create index "requests_request_to_id_index" on "requests" ("request_to_id");`
        );
        this.addSql(
            `create index "requests_request_from_id_index" on "requests" ("request_from_id");`
        );
        this.addSql(
            `create index "requests_type_index" on "requests" ("type");`
        );

        this.addSql(
            `create table "notifications" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "title" varchar(255) not null, "message" varchar(1000) not null, "type" text check ("type" in ('info', 'success', 'warning', 'error', 'reminder', 'invitation', 'activity', 'system', 'request')) not null, "priority" text check ("priority" in ('low', 'medium', 'high', 'urgent')) not null default 'medium', "status" text check ("status" in ('read', 'archived', 'unread', 'dismissed')) not null default 'unread', "recipient_id" uuid not null, "sender_id" uuid null, "metadata_action_url" varchar(500) null, "metadata_action_text" varchar(255) null, "metadata_data" jsonb null, "read_at" timestamptz null, "archived_at" timestamptz null, "scheduled_at" timestamptz null, "expires_at" timestamptz null, "tags" text[] not null default '{}', "workspace_id" uuid null, constraint "notifications_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "notifications_deleted_at_index" on "notifications" ("deleted_at");`
        );
        this.addSql(
            `create index "notifications_updated_at_index" on "notifications" ("updated_at");`
        );
        this.addSql(
            `create index "notifications_created_at_index" on "notifications" ("created_at");`
        );
        this.addSql(
            `create index "notifications_deleted_index" on "notifications" ("deleted");`
        );
        this.addSql(
            `create index "notifications_priority_index" on "notifications" ("priority");`
        );
        this.addSql(
            `create index "notifications_type_index" on "notifications" ("type");`
        );
        this.addSql(
            `create index "notifications_status_index" on "notifications" ("status");`
        );
        this.addSql(
            `create index "notifications_sender_id_index" on "notifications" ("sender_id");`
        );
        this.addSql(
            `create index "notifications_recipient_id_index" on "notifications" ("recipient_id");`
        );

        this.addSql(
            `create table "invitations" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "workspace_id" uuid not null, "inviter_id" uuid not null, "invitee_email" varchar(255) not null, "role_id" uuid null, "status" text check ("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')) not null default 'PENDING', "token" varchar(255) not null, "expires_at" timestamptz not null, "accepted_at" timestamptz null, "accepted_by_user_id" uuid null, "revoked_at" timestamptz null, "revoked_by_user_id" uuid null, "invitation_link" varchar(500) null, constraint "invitations_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "invitations_invitee_email_index" on "invitations" ("invitee_email");`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_token_unique" unique ("token");`
        );
        this.addSql(
            `create index "invitations_deleted_at_index" on "invitations" ("deleted_at");`
        );
        this.addSql(
            `create index "invitations_updated_at_index" on "invitations" ("updated_at");`
        );
        this.addSql(
            `create index "invitations_created_at_index" on "invitations" ("created_at");`
        );
        this.addSql(
            `create index "invitations_deleted_index" on "invitations" ("deleted");`
        );
        this.addSql(
            `create index "invitations_expires_at_index" on "invitations" ("expires_at");`
        );
        this.addSql(
            `create index "invitations_token_index" on "invitations" ("token");`
        );
        this.addSql(
            `create index "invitations_workspace_id_invitee_email_index" on "invitations" ("workspace_id", "invitee_email");`
        );

        this.addSql(
            `create table "chatbots" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "name" varchar(255) not null, "avatar" varchar(500) null, "general_knowledge" text null, "workspace_id" uuid not null, "accounts" jsonb not null default '[]', "typing_indicator" boolean not null default true, "auto_read" boolean not null default true, "status" text check ("status" in ('active', 'inactive', 'archived')) not null default 'active', "type" text check ("type" in ('beauty', 'fashion', 'restaurant', 'ecommerce', 'healthcare', 'finance', 'education', 'travel', 'spa', 'fitness', 'automotive', 'real_estate', 'entertainment', 'other')) not null default 'beauty', "added_by_id" uuid not null, constraint "chatbots_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "chatbots_deleted_at_index" on "chatbots" ("deleted_at");`
        );
        this.addSql(
            `create index "chatbots_updated_at_index" on "chatbots" ("updated_at");`
        );
        this.addSql(
            `create index "chatbots_created_at_index" on "chatbots" ("created_at");`
        );
        this.addSql(
            `create index "chatbots_deleted_index" on "chatbots" ("deleted");`
        );
        this.addSql(
            `create index "chatbots_type_index" on "chatbots" ("type");`
        );
        this.addSql(
            `create index "chatbots_status_index" on "chatbots" ("status");`
        );
        this.addSql(
            `create index "chatbots_added_by_id_index" on "chatbots" ("added_by_id");`
        );
        this.addSql(
            `create index "chatbots_workspace_id_index" on "chatbots" ("workspace_id");`
        );

        this.addSql(
            `create table "rags" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "attachment_bucket" varchar(255) not null, "attachment_key" varchar(255) not null, "attachment_completed_url" varchar(255) not null, "attachment_cdn_url" varchar(255) null, "attachment_mime" varchar(255) not null, "attachment_extension" varchar(255) not null, "attachment_size" numeric(10,2) not null, "chatbot_id" uuid not null, "workspace_id" uuid not null, "status" text check ("status" in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')) not null default 'PENDING', "embedding" text[] null, "error_code" int null, "error_message" text null, constraint "rags_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "rags_deleted_at_index" on "rags" ("deleted_at");`
        );
        this.addSql(
            `create index "rags_updated_at_index" on "rags" ("updated_at");`
        );
        this.addSql(
            `create index "rags_created_at_index" on "rags" ("created_at");`
        );
        this.addSql(`create index "rags_deleted_index" on "rags" ("deleted");`);
        this.addSql(`create index "rags_status_index" on "rags" ("status");`);
        this.addSql(
            `create index "rags_workspace_id_index" on "rags" ("workspace_id");`
        );
        this.addSql(
            `create index "rags_chatbot_id_index" on "rags" ("chatbot_id");`
        );
        this.addSql(
            `create index "rags_workspace_id_chatbot_id_index" on "rags" ("workspace_id", "chatbot_id");`
        );

        this.addSql(
            `create table "orders" ("id" varchar(20) not null, "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "chatbot_id" uuid null, "workspace_id" uuid not null, "phone_number" varchar(20) not null, "email" varchar(255) null, "customer_name" varchar(255) null, "details" jsonb not null, "note" text null, "status" text check ("status" in ('OPEN', 'CLOSE')) not null default 'OPEN', "type" text check ("type" in ('PRODUCT', 'SERVICE', 'CONSULTING')) not null default 'CONSULTING', constraint "orders_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "orders_deleted_at_index" on "orders" ("deleted_at");`
        );
        this.addSql(
            `create index "orders_updated_at_index" on "orders" ("updated_at");`
        );
        this.addSql(
            `create index "orders_created_at_index" on "orders" ("created_at");`
        );
        this.addSql(
            `create index "orders_deleted_index" on "orders" ("deleted");`
        );
        this.addSql(
            `create index "orders_chatbot_id_index" on "orders" ("chatbot_id");`
        );
        this.addSql(
            `create index "orders_workspace_id_index" on "orders" ("workspace_id");`
        );
        this.addSql(
            `create index "orders_customer_name_index" on "orders" ("customer_name");`
        );
        this.addSql(`create index "orders_email_index" on "orders" ("email");`);
        this.addSql(
            `create index "orders_phone_number_index" on "orders" ("phone_number");`
        );

        this.addSql(
            `create table "activities" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "user_id" uuid not null, "workspace_id" uuid null, "subject" text check ("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG')) not null, "action" text check ("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot')) not null, "by_id" uuid not null, "metadata" jsonb null, constraint "activities_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "activities_deleted_at_index" on "activities" ("deleted_at");`
        );
        this.addSql(
            `create index "activities_updated_at_index" on "activities" ("updated_at");`
        );
        this.addSql(
            `create index "activities_created_at_index" on "activities" ("created_at");`
        );
        this.addSql(
            `create index "activities_deleted_index" on "activities" ("deleted");`
        );
        this.addSql(
            `create index "activities_by_id_index" on "activities" ("by_id");`
        );
        this.addSql(
            `create index "activities_workspace_id_index" on "activities" ("workspace_id");`
        );
        this.addSql(
            `create index "activities_user_id_index" on "activities" ("user_id");`
        );

        this.addSql(
            `create table "accounts" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "external_id" varchar(255) not null, "name" varchar(255) not null, "slug" varchar(255) not null, "avatar" text null, "link" text null, "status" text check ("status" in ('ACTIVE', 'INACTIVE', 'BLOCKED')) not null default 'ACTIVE', "added_by_id" uuid null, "workspace_id" uuid not null, "type" text check ("type" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE')) not null, "access_token" text not null, "account_id" uuid null, constraint "accounts_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_external_id_unique" unique ("external_id");`
        );
        this.addSql(
            `create index "accounts_deleted_at_index" on "accounts" ("deleted_at");`
        );
        this.addSql(
            `create index "accounts_updated_at_index" on "accounts" ("updated_at");`
        );
        this.addSql(
            `create index "accounts_created_at_index" on "accounts" ("created_at");`
        );
        this.addSql(
            `create index "accounts_deleted_index" on "accounts" ("deleted");`
        );
        this.addSql(
            `create index "accounts_slug_index" on "accounts" ("slug");`
        );
        this.addSql(
            `create index "accounts_workspace_id_index" on "accounts" ("workspace_id");`
        );

        this.addSql(
            `create table "cookies" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "authed" boolean not null default false, "account_id" uuid not null, "label" varchar(255) null, "status" varchar(100) not null, "last_updated_at" timestamptz null, constraint "cookies_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "cookies_deleted_at_index" on "cookies" ("deleted_at");`
        );
        this.addSql(
            `create index "cookies_updated_at_index" on "cookies" ("updated_at");`
        );
        this.addSql(
            `create index "cookies_created_at_index" on "cookies" ("created_at");`
        );
        this.addSql(
            `create index "cookies_deleted_index" on "cookies" ("deleted");`
        );

        this.addSql(
            `create table "workspace_members" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by" varchar(255) null, "updated_at" timestamptz null, "updated_by" varchar(255) null, "deleted_at" timestamptz null, "deleted_by" varchar(255) null, "workspace_id" uuid not null, "user_id" uuid not null, "role_id" uuid not null, "joined_at" timestamptz not null default 'now()', "is_active" boolean not null default true, constraint "workspace_members_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "workspace_members_deleted_at_index" on "workspace_members" ("deleted_at");`
        );
        this.addSql(
            `create index "workspace_members_updated_at_index" on "workspace_members" ("updated_at");`
        );
        this.addSql(
            `create index "workspace_members_created_at_index" on "workspace_members" ("created_at");`
        );
        this.addSql(
            `create index "workspace_members_deleted_index" on "workspace_members" ("deleted");`
        );
        this.addSql(
            `create index "workspace_members_is_active_index" on "workspace_members" ("is_active");`
        );
        this.addSql(
            `create index "workspace_members_role_id_index" on "workspace_members" ("role_id");`
        );
        this.addSql(
            `create index "workspace_members_user_id_index" on "workspace_members" ("user_id");`
        );
        this.addSql(
            `create index "workspace_members_workspace_id_index" on "workspace_members" ("workspace_id");`
        );
        this.addSql(
            `create index "workspace_members_workspace_id_user_id_index" on "workspace_members" ("workspace_id", "user_id");`
        );

        this.addSql(
            `alter table "workspaces" add constraint "workspaces_owner_id_foreign" foreign key ("owner_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "roles" add constraint "roles_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "users" add constraint "users_mobile_number_country_id_foreign" foreign key ("mobile_number_country_id") references "countries" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "users" add constraint "users_role_id_foreign" foreign key ("role_id") references "roles" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "users" add constraint "users_country_id_foreign" foreign key ("country_id") references "countries" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "verifications" add constraint "verifications_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "sessions" add constraint "sessions_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "reset_passwords" add constraint "reset_passwords_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "proxies" add constraint "proxies_added_by_id_foreign" foreign key ("added_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "password_histories" add constraint "password_histories_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "password_histories" add constraint "password_histories_by_id_foreign" foreign key ("by_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "requests" add constraint "requests_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "requests" add constraint "requests_request_from_id_foreign" foreign key ("request_from_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "requests" add constraint "requests_request_to_id_foreign" foreign key ("request_to_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "requests" add constraint "requests_processed_by_id_foreign" foreign key ("processed_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "notifications" add constraint "notifications_recipient_id_foreign" foreign key ("recipient_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "notifications" add constraint "notifications_sender_id_foreign" foreign key ("sender_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "notifications" add constraint "notifications_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "invitations" add constraint "invitations_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_inviter_id_foreign" foreign key ("inviter_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_role_id_foreign" foreign key ("role_id") references "roles" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_accepted_by_user_id_foreign" foreign key ("accepted_by_user_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_revoked_by_user_id_foreign" foreign key ("revoked_by_user_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "chatbots" add constraint "chatbots_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_added_by_id_foreign" foreign key ("added_by_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "rags" add constraint "rags_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "rags" add constraint "rags_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "orders" add constraint "orders_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_by_id_foreign" foreign key ("by_id") references "users" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "accounts" add constraint "accounts_added_by_id_foreign" foreign key ("added_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "cookies" add constraint "cookies_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "workspace_members" add constraint "workspace_members_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "workspace_members" add constraint "workspace_members_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "workspace_members" add constraint "workspace_members_role_id_foreign" foreign key ("role_id") references "roles" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "users" drop constraint "users_mobile_number_country_id_foreign";`
        );

        this.addSql(
            `alter table "users" drop constraint "users_country_id_foreign";`
        );

        this.addSql(
            `alter table "roles" drop constraint "roles_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "requests" drop constraint "requests_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "notifications" drop constraint "notifications_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "invitations" drop constraint "invitations_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "chatbots" drop constraint "chatbots_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "rags" drop constraint "rags_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "orders" drop constraint "orders_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint "activities_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "accounts" drop constraint "accounts_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "workspace_members" drop constraint "workspace_members_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "users" drop constraint "users_role_id_foreign";`
        );

        this.addSql(
            `alter table "invitations" drop constraint "invitations_role_id_foreign";`
        );

        this.addSql(
            `alter table "workspace_members" drop constraint "workspace_members_role_id_foreign";`
        );

        this.addSql(
            `alter table "workspaces" drop constraint "workspaces_owner_id_foreign";`
        );

        this.addSql(
            `alter table "verifications" drop constraint "verifications_user_id_foreign";`
        );

        this.addSql(
            `alter table "sessions" drop constraint "sessions_user_id_foreign";`
        );

        this.addSql(
            `alter table "reset_passwords" drop constraint "reset_passwords_user_id_foreign";`
        );

        this.addSql(
            `alter table "proxies" drop constraint "proxies_added_by_id_foreign";`
        );

        this.addSql(
            `alter table "password_histories" drop constraint "password_histories_user_id_foreign";`
        );

        this.addSql(
            `alter table "password_histories" drop constraint "password_histories_by_id_foreign";`
        );

        this.addSql(
            `alter table "requests" drop constraint "requests_request_from_id_foreign";`
        );

        this.addSql(
            `alter table "requests" drop constraint "requests_request_to_id_foreign";`
        );

        this.addSql(
            `alter table "requests" drop constraint "requests_processed_by_id_foreign";`
        );

        this.addSql(
            `alter table "notifications" drop constraint "notifications_recipient_id_foreign";`
        );

        this.addSql(
            `alter table "notifications" drop constraint "notifications_sender_id_foreign";`
        );

        this.addSql(
            `alter table "invitations" drop constraint "invitations_inviter_id_foreign";`
        );

        this.addSql(
            `alter table "invitations" drop constraint "invitations_accepted_by_user_id_foreign";`
        );

        this.addSql(
            `alter table "invitations" drop constraint "invitations_revoked_by_user_id_foreign";`
        );

        this.addSql(
            `alter table "chatbots" drop constraint "chatbots_added_by_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint "activities_user_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint "activities_by_id_foreign";`
        );

        this.addSql(
            `alter table "accounts" drop constraint "accounts_added_by_id_foreign";`
        );

        this.addSql(
            `alter table "workspace_members" drop constraint "workspace_members_user_id_foreign";`
        );

        this.addSql(
            `alter table "rags" drop constraint "rags_chatbot_id_foreign";`
        );

        this.addSql(
            `alter table "orders" drop constraint "orders_chatbot_id_foreign";`
        );

        this.addSql(
            `alter table "accounts" drop constraint "accounts_account_id_foreign";`
        );

        this.addSql(
            `alter table "cookies" drop constraint "cookies_account_id_foreign";`
        );
    }
}
