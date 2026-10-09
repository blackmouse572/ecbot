import { Migration } from '@mikro-orm/migrations';

export class Migration20261008143256_add_user_handoff_emails extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "users" add column "handoff_emails" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop column "handoff_emails";`);
  }

}
