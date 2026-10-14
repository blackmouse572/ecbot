import { Migration } from '@mikro-orm/migrations';

// New workspaces get a "New booking" tag that hands a confirmed booking or
// callback request to the owner, the way "New order" does for orders (#291).
// Give existing workspaces the same tag, named in Vietnamese where the
// workspace still has the Vietnamese catalog ("Khiếu nại" or "Bực tức"). A
// workspace that already has a tag with either name keeps what it has.
export class Migration20261013170000_backfill_new_booking_tag extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            insert into "customer_tags" ("workspace_id", "name", "emoji", "description", "triggers_handoff")
            select
                w."id",
                case when vi."workspace_id" is null then 'New booking' else 'Lịch hẹn mới' end,
                '🗓️',
                case when vi."workspace_id" is null
                    then 'Customer confirmed a booking or callback for staff to confirm.'
                    else 'Khách đã chốt lịch hẹn hoặc nhờ gọi lại, cần nhân viên xác nhận.'
                end,
                true
            from "workspaces" w
            left join (
                select distinct "workspace_id"
                from "customer_tags"
                where "deleted_at" is null
                  and "name" in ('Khiếu nại', 'Bực tức')
            ) vi on vi."workspace_id" = w."id"
            where w."deleted_at" is null
              and not exists (
                  select 1 from "customer_tags" t
                  where t."workspace_id" = w."id"
                    and t."deleted_at" is null
                    and t."name" in ('New booking', 'Lịch hẹn mới')
              );
        `);
    }

    override async down(): Promise<void> {
        // Owners may already use the tag on customers, and a backfilled tag
        // cannot be told apart from one created by hand.
    }
}
