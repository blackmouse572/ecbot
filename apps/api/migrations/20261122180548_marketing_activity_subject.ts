import { Migration } from '@mikro-orm/migrations';

export class Migration20261122180548_marketing_activity_subject extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CUSTOMER_DATA', 'CONTACT_POINT', 'CONVERSATION', 'MARKETING', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST', 'TOKEN_USAGE', 'PLAN'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CUSTOMER_DATA', 'CONTACT_POINT', 'CONVERSATION', 'INVITATION', 'CLIENT_CREDENTIAL', 'SKILL', 'WAITLIST', 'TOKEN_USAGE', 'PLAN'));`
        );
    }
}
