import { Migration } from '@mikro-orm/migrations';

export class Migration20261125084000_marketing_offered_today extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "marketing_messages" drop constraint if exists "marketing_messages_skip_reason_check";`);

    this.addSql(`alter table "marketing_messages" add constraint "marketing_messages_skip_reason_check" check("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED', 'OPTED_OUT', 'ACCOUNT_BLOCKED', 'SEND_HOURS_ENDED', 'OFFERED_TODAY'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "marketing_messages" drop constraint if exists "marketing_messages_skip_reason_check";`);

    this.addSql(`alter table "marketing_messages" add constraint "marketing_messages_skip_reason_check" check("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED', 'OPTED_OUT', 'ACCOUNT_BLOCKED', 'SEND_HOURS_ENDED'));`);
  }

}
