import { Migration } from '@mikro-orm/migrations';

export class Migration20251122094116 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "workspaces" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "workspaces" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "workspaces" add constraint "workspaces_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspaces" add constraint "workspaces_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspaces" add constraint "workspaces_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "roles" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "roles" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "roles" add constraint "roles_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "roles" add constraint "roles_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "roles" add constraint "roles_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "countries" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "countries" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "countries" add constraint "countries_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "countries" add constraint "countries_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "countries" add constraint "countries_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "users" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "users" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "users" add constraint "users_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "users" add constraint "users_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "users" add constraint "users_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "verifications" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "verifications" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "verifications" add constraint "verifications_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "verifications" add constraint "verifications_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "verifications" add constraint "verifications_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "sessions" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "sessions" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "sessions" add constraint "sessions_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "sessions" add constraint "sessions_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "sessions" add constraint "sessions_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "reset_passwords" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "reset_passwords" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "reset_passwords" add constraint "reset_passwords_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "reset_passwords" add constraint "reset_passwords_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "reset_passwords" add constraint "reset_passwords_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "proxies" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "proxies" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "proxies" add constraint "proxies_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "proxies" add constraint "proxies_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "proxies" add constraint "proxies_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "password_histories" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "password_histories" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "password_histories" add constraint "password_histories_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "password_histories" add constraint "password_histories_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "password_histories" add constraint "password_histories_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "facebook_activities" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "facebook_activities" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "facebook_activities" add constraint "facebook_activities_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "facebook_activities" add constraint "facebook_activities_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "facebook_activities" add constraint "facebook_activities_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "database_entity_base" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "database_entity_base" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "database_entity_base" add constraint "database_entity_base_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "database_entity_base" add constraint "database_entity_base_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "database_entity_base" add constraint "database_entity_base_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "api_keys" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "api_keys" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "api_keys" add constraint "api_keys_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "api_keys" add constraint "api_keys_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "api_keys" add constraint "api_keys_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "requests" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "requests" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "requests" add constraint "requests_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "requests" add constraint "requests_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "requests" add constraint "requests_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "notifications" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "notifications" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "notifications" add constraint "notifications_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "notifications" add constraint "notifications_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "notifications" add constraint "notifications_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "invitations" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "invitations" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "chatbots" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "chatbots" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbots" add constraint "chatbots_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "rags" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "rags" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "rags" add constraint "rags_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "rags" add constraint "rags_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "rags" add constraint "rags_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "orders" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "orders" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "activities" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "activities" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "accounts" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "accounts" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "cookies" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "cookies" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "cookies" add constraint "cookies_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "cookies" add constraint "cookies_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "cookies" add constraint "cookies_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "workspace_members" drop column "created_by", drop column "updated_by", drop column "deleted_by";`
        );

        this.addSql(
            `alter table "workspace_members" add column "created_by_id" uuid null, add column "updated_by_id" uuid null, add column "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "workspace_members" add constraint "workspace_members_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspace_members" add constraint "workspace_members_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspace_members" add constraint "workspace_members_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "api_keys" drop constraint "api_keys_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "api_keys" drop constraint "api_keys_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "api_keys" drop constraint "api_keys_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "countries" drop constraint "countries_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "countries" drop constraint "countries_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "countries" drop constraint "countries_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "database_entity_base" drop constraint "database_entity_base_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "database_entity_base" drop constraint "database_entity_base_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "database_entity_base" drop constraint "database_entity_base_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "facebook_activities" drop constraint "facebook_activities_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "facebook_activities" drop constraint "facebook_activities_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "facebook_activities" drop constraint "facebook_activities_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "workspaces" drop constraint "workspaces_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "workspaces" drop constraint "workspaces_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "workspaces" drop constraint "workspaces_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "roles" drop constraint "roles_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "roles" drop constraint "roles_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "roles" drop constraint "roles_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "users" drop constraint "users_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "users" drop constraint "users_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "users" drop constraint "users_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "verifications" drop constraint "verifications_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "verifications" drop constraint "verifications_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "verifications" drop constraint "verifications_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "sessions" drop constraint "sessions_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "sessions" drop constraint "sessions_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "sessions" drop constraint "sessions_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "reset_passwords" drop constraint "reset_passwords_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "reset_passwords" drop constraint "reset_passwords_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "reset_passwords" drop constraint "reset_passwords_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "proxies" drop constraint "proxies_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "proxies" drop constraint "proxies_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "proxies" drop constraint "proxies_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "password_histories" drop constraint "password_histories_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "password_histories" drop constraint "password_histories_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "password_histories" drop constraint "password_histories_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "requests" drop constraint "requests_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "requests" drop constraint "requests_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "requests" drop constraint "requests_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "notifications" drop constraint "notifications_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "notifications" drop constraint "notifications_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "notifications" drop constraint "notifications_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "invitations" drop constraint "invitations_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "invitations" drop constraint "invitations_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "invitations" drop constraint "invitations_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "chatbots" drop constraint "chatbots_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "chatbots" drop constraint "chatbots_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "chatbots" drop constraint "chatbots_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "rags" drop constraint "rags_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "rags" drop constraint "rags_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "rags" drop constraint "rags_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "orders" drop constraint "orders_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "orders" drop constraint "orders_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "orders" drop constraint "orders_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint "activities_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "activities" drop constraint "activities_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "activities" drop constraint "activities_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "accounts" drop constraint "accounts_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "accounts" drop constraint "accounts_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "accounts" drop constraint "accounts_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "cookies" drop constraint "cookies_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "cookies" drop constraint "cookies_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "cookies" drop constraint "cookies_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "workspace_members" drop constraint "workspace_members_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "workspace_members" drop constraint "workspace_members_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "workspace_members" drop constraint "workspace_members_deleted_by_id_foreign";`
        );

        this.addSql(
            `alter table "api_keys" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "api_keys" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "countries" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "countries" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "database_entity_base" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "database_entity_base" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "facebook_activities" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "facebook_activities" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "workspaces" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "workspaces" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "roles" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "roles" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "users" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "users" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "verifications" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "verifications" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "sessions" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "sessions" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "reset_passwords" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "reset_passwords" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "proxies" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "proxies" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "password_histories" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "password_histories" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "requests" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "requests" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "notifications" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "notifications" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "invitations" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "invitations" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "chatbots" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "chatbots" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "rags" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "rags" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "orders" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "orders" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "activities" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "activities" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "accounts" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "accounts" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "cookies" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "cookies" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );

        this.addSql(
            `alter table "workspace_members" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "workspace_members" add column "created_by" varchar(255) null, add column "updated_by" varchar(255) null, add column "deleted_by" varchar(255) null;`
        );
    }
}
