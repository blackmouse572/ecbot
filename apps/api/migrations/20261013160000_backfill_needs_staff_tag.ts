import { Migration } from '@mikro-orm/migrations';

// New workspaces get a neutral "Needs staff" tag that hands the conversation
// to a person when the customer just asks for one, so the agent stops
// marking them as a complaint (#282). Give existing workspaces the same tag,
// named in Vietnamese where the workspace still has the Vietnamese catalog
// ("Khiếu nại" or "Bực tức"). A workspace that already has a tag with either
// name keeps what it has.
export class Migration20261013160000_backfill_needs_staff_tag extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            insert into "customer_tags" ("workspace_id", "name", "emoji", "description", "triggers_handoff")
            select
                w."id",
                case when vi."workspace_id" is null then 'Needs staff' else 'Cần nhân viên' end,
                '🙋',
                case when vi."workspace_id" is null
                    then 'Customer asked to talk to a person.'
                    else 'Khách muốn trao đổi với nhân viên.'
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
                    and t."name" in ('Needs staff', 'Cần nhân viên')
              );
        `);
    }

    override async down(): Promise<void> {
        // Owners may already use the tag on customers, and a backfilled tag
        // cannot be told apart from one created by hand.
    }
}
