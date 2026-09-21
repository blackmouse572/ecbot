import { Migration } from '@mikro-orm/migrations';

export class Migration20260228052007 extends Migration {
    async up(): Promise<void> {
        // Drop existing constraint
        this.addSql(
            `ALTER TABLE "activities" DROP CONSTRAINT "activities_subject_check";`
        );

        // Add new constraint with KNOWLEDGE_BASE included
        this.addSql(
            `ALTER TABLE "activities" ADD CONSTRAINT "activities_subject_check" CHECK ("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE'));`
        );
    }

    async down(): Promise<void> {
        // Drop new constraint
        this.addSql(
            `ALTER TABLE "activities" DROP CONSTRAINT "activities_subject_check";`
        );

        // Restore original constraint
        this.addSql(
            `ALTER TABLE "activities" ADD CONSTRAINT "activities_subject_check" CHECK ("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG'));`
        );
    }
}
