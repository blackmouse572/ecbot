import { Migration } from '@mikro-orm/migrations';

export class Migration20260724154609_AddFollowupRules extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "chatbots" add column if not exists "followup_rules" text null;'
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            'alter table "chatbots" drop column if exists "followup_rules";'
        );
    }
}
