import { Migration } from '@mikro-orm/migrations';

// A tag can now tell the team when the agent applies it, without handing
// the conversation over (#288). New workspaces get an "Order placed" tag
// with that flag, which agents apply after their order tool places an
// order. Give existing workspaces the same tag, named in Vietnamese where
// the workspace still has the Vietnamese catalog ("Khiếu nại" or
// "Bực tức"). A workspace that already has a tag with either name keeps
// what it has.
export class Migration20261013180000_add_order_placed_tag extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "customer_tags" add column if not exists "notifies_team" boolean not null default false;'
        );
        this.addSql(`
            insert into "customer_tags" ("workspace_id", "name", "emoji", "description", "triggers_handoff", "notifies_team")
            select
                w."id",
                case when vi."workspace_id" is null then 'Order placed' else 'Đã đặt đơn' end,
                '🛒',
                case when vi."workspace_id" is null
                    then 'The order tool placed an order for the customer.'
                    else 'Đơn hàng đã được đặt qua công cụ đặt hàng.'
                end,
                false,
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
                    and t."name" in ('Order placed', 'Đã đặt đơn')
              );
        `);
    }

    override async down(): Promise<void> {
        // The backfilled tag stays: owners may already use it on customers,
        // and it cannot be told apart from one created by hand.
        this.addSql(
            'alter table "customer_tags" drop column if exists "notifies_team";'
        );
    }
}
