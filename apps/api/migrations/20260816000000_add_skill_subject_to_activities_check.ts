import { Migration } from '@mikro-orm/migrations';

export class Migration20260816000000_add_skill_subject_to_activities_check extends Migration {
    override async up(): Promise<void> {
        // Allow SKILL as an activity subject (workspace skill CRUD + chatbot attach).
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL'));`
        );
    }
}
