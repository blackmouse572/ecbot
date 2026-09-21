import { Migration } from '@mikro-orm/migrations';

/**
 * Mark the bootstrap tier as a system plan, and undo its archival.
 *
 * `free` is the plan every pre-billing workspace was placed on, and the one a
 * workspace falls back to. Nothing stopped an admin archiving it from the
 * plans table, which left every workspace subscribed to a plan that is
 * supposed to be retired — nothing broke (the guard reads the subscription's
 * quota snapshot, not `plan.is_active`), but the state is incoherent and the
 * plan could no longer be assigned to anyone.
 *
 * `is_system` makes that protection explicit rather than a rule someone has to
 * remember; `PlanService.archive` refuses on it.
 *
 * `plans` is the enterprise overlay's table, so the whole body is guarded on it
 * existing: in the open engine there is nothing to protect and this is a no-op,
 * while the hosted edition (where the table is created before this runs) is
 * unaffected.
 */
export class Migration20260914120000_protect_system_plan extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            do $$
            begin
                if to_regclass('public.plans') is not null then
                    alter table "plans" add column if not exists "is_system" boolean not null default false;
                    comment on column "plans"."is_system" is 'A plan the product depends on — cannot be archived';

                    -- Restore and protect the bootstrap tier in one step:
                    -- marking it system while leaving it archived would lock in
                    -- the broken state, since archive is exactly the operation
                    -- now forbidden.
                    update "plans" set "is_system" = true, "is_active" = true where "slug" = 'free';
                end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table if exists "plans" drop column if exists "is_system";`
        );
    }
}
