import { Migration } from '@mikro-orm/migrations';

export class Migration20260815000000_create_skills extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "skills" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid null, "name" varchar(255) not null, "slug" varchar(255) not null, "description" text null, "status" text check ("status" in ('ACTIVE', 'INACTIVE')) not null default 'ACTIVE', "s3_bucket" varchar(255) not null, "s3_key" varchar(255) not null, "s3_completed_url" varchar(255) not null, "s3_cdn_url" varchar(255) null, "s3_mime" varchar(255) not null, "s3_extension" varchar(255) not null, "s3_size" numeric(10,2) not null, constraint "skills_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "skills_deleted_at_index" on "skills" ("deleted_at");`
        );
        this.addSql(
            `create index "skills_updated_at_index" on "skills" ("updated_at");`
        );
        this.addSql(
            `create index "skills_created_at_index" on "skills" ("created_at");`
        );
        this.addSql(
            `create index "skills_deleted_index" on "skills" ("deleted");`
        );
        this.addSql(
            `create index "skills_workspace_id_index" on "skills" ("workspace_id");`
        );
        this.addSql(
            `alter table "skills" add constraint "skills_workspace_id_slug_unique" unique ("workspace_id", "slug");`
        );

        this.addSql(
            `alter table "skills" add constraint "skills_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "skills" add constraint "skills_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "skills" add constraint "skills_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "skills" add constraint "skills_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `create table "chatbot_skills" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "chatbot_id" uuid not null, "skill_id" uuid not null, "enabled" boolean not null default true, constraint "chatbot_skills_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "chatbot_skills_deleted_at_index" on "chatbot_skills" ("deleted_at");`
        );
        this.addSql(
            `create index "chatbot_skills_updated_at_index" on "chatbot_skills" ("updated_at");`
        );
        this.addSql(
            `create index "chatbot_skills_created_at_index" on "chatbot_skills" ("created_at");`
        );
        this.addSql(
            `create index "chatbot_skills_deleted_index" on "chatbot_skills" ("deleted");`
        );
        this.addSql(
            `create index "chatbot_skills_chatbot_id_index" on "chatbot_skills" ("chatbot_id");`
        );
        this.addSql(
            `create index "chatbot_skills_skill_id_index" on "chatbot_skills" ("skill_id");`
        );
        this.addSql(
            `alter table "chatbot_skills" add constraint "chatbot_skills_chatbot_id_skill_id_unique" unique ("chatbot_id", "skill_id");`
        );

        this.addSql(
            `alter table "chatbot_skills" add constraint "chatbot_skills_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_skills" add constraint "chatbot_skills_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_skills" add constraint "chatbot_skills_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_skills" add constraint "chatbot_skills_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "chatbot_skills" add constraint "chatbot_skills_skill_id_foreign" foreign key ("skill_id") references "skills" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "chatbot_skills" cascade;`);
        this.addSql(`drop table if exists "skills" cascade;`);
    }
}
