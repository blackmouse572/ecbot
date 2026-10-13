import { Migration } from '@mikro-orm/migrations';

// New workspaces get a "New order" tag that hands a confirmed order to the
// owner when no order tool is connected (#281). Give existing workspaces the
// same tag. Workspaces do not store their language, so a workspace seeded
// with the Vietnamese catalog (it still has "Khiếu nại" or "Bực tức") gets
// the Vietnamese name. A workspace that already has a tag with either name
// keeps what it has.
export class Migration20261013130000_backfill_new_order_tag extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            insert into "customer_tags" ("workspace_id", "name", "emoji", "description", "triggers_handoff")
            select
                w."id",
                case when vi."workspace_id" is null then 'New order' else 'Đơn hàng mới' end,
                '🧾',
                case when vi."workspace_id" is null
                    then 'Customer confirmed an order for staff to finish.'
                    else 'Khách đã chốt đơn, cần nhân viên xác nhận.'
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
                    and t."name" in ('New order', 'Đơn hàng mới')
              );
        `);
    }

    override async down(): Promise<void> {
        // Owners may already use the tag on customers, and a backfilled tag
        // cannot be told apart from one created by hand.
    }
}
