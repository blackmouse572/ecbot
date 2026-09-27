import { Migration } from '@mikro-orm/migrations';

export class Migration20260924143205_chatbot_agent_profile extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "chatbots" add column "agent_profile" jsonb null, add column "extra_instructions" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "chatbots" drop column "agent_profile", drop column "extra_instructions";`);
  }

}
