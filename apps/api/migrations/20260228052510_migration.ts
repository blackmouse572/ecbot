import { Migration } from '@mikro-orm/migrations';

export class Migration20260228052510 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_knowledge_base_id_foreign";`
        );
        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_parent_folder_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `drop index "knowledge_base_folders_knowledge_base_id_slug_pare_d7ede_index";`
        );

        this.addSql(
            `alter table "knowledge_base_folders" alter column "knowledge_base_id" drop default;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" alter column "knowledge_base_id" type uuid using ("knowledge_base_id"::text::uuid);`
        );
        this.addSql(
            `alter table "knowledge_base_folders" alter column "knowledge_base_id" drop not null;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_knowledge_base_id_foreign" foreign key ("knowledge_base_id") references "knowledge_bases" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_parent_folder_id_foreign" foreign key ("parent_folder_id") references "knowledge_base_folders" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_knowledge_base_id_slug_par_daa13_unique" unique ("knowledge_base_id", "slug", "parent_folder_id");`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_knowledge_base_id_foreign";`
        );
        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_parent_folder_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_knowledge_base_id_slug_par_daa13_unique";`
        );

        this.addSql(
            `alter table "knowledge_base_folders" alter column "knowledge_base_id" drop default;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" alter column "knowledge_base_id" type uuid using ("knowledge_base_id"::text::uuid);`
        );
        this.addSql(
            `alter table "knowledge_base_folders" alter column "knowledge_base_id" set not null;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_knowledge_base_id_foreign" foreign key ("knowledge_base_id") references "knowledge_bases" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_parent_folder_id_foreign" foreign key ("parent_folder_id") references "knowledge_base_folders" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `create index "knowledge_base_folders_knowledge_base_id_slug_pare_d7ede_index" on "knowledge_base_folders" ("knowledge_base_id", "slug", "parent_folder_id");`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG'));`
        );
    }
}
