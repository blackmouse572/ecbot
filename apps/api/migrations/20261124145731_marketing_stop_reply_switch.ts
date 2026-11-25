import { Migration } from '@mikro-orm/migrations';

export class Migration20261124145731_marketing_stop_reply_switch extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "marketing_settings" add column "stop_reply_enabled" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "marketing_settings" drop column "stop_reply_enabled";`);
  }

}
