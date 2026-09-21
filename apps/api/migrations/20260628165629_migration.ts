import { Migration } from '@mikro-orm/migrations';

export class Migration20260628165629 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "chatbots" add column "guardrail_enabled" boolean not null default false, add column "guardrail_model_enabled" boolean not null default false, add column "guardrail_custom_instruction" text null, add column "guardrail_escalate_on_block" boolean not null default true;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "chatbots" drop column "guardrail_enabled", drop column "guardrail_model_enabled", drop column "guardrail_custom_instruction", drop column "guardrail_escalate_on_block";`
        );
    }
}
