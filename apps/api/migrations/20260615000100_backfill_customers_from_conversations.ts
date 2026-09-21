import { Migration } from '@mikro-orm/migrations';

/**
 * One-shot backfill: for each distinct (workspace, account.type, sender_id)
 * tuple on existing conversations that don't yet have a contact_point_id,
 * create a Customer + ContactPoint and set the FK.
 *
 * Idempotent: only touches conversations with contact_point_id IS NULL, so
 * re-runs skip already-backfilled rows.
 */
export class Migration20260615000100_backfill_customers_from_conversations extends Migration {
    override async up(): Promise<void> {
        // Step 1: build a working set of distinct tuples that need backfilling.
        // We pick the most recent senderName/avatar/fetchedAt per tuple to seed
        // the new ContactPoint (and seed the Customer name).
        this.addSql(`
            create temporary table "_customer_backfill" as
            with src as (
                select
                    c."id" as conversation_id,
                    cb."workspace_id" as workspace_id,
                    a."type" as platform,
                    c."sender_id" as external_sender_id,
                    c."sender_name" as sender_name,
                    c."sender_avatar" as sender_avatar,
                    c."sender_profile_fetched_at" as sender_profile_fetched_at,
                    c."updated_at" as conversation_updated_at,
                    c."created_at" as conversation_created_at
                from "conversations" c
                join "chatbots" cb on cb."id" = c."chatbot_id"
                join "accounts" a on a."id" = c."account_id"
                where c."contact_point_id" is null
                  and (c."deleted" is null or c."deleted" = false)
                  and (c."deleted_at" is null)
            ),
            ranked as (
                select
                    workspace_id,
                    platform,
                    external_sender_id,
                    sender_name,
                    sender_avatar,
                    sender_profile_fetched_at,
                    row_number() over (
                        partition by workspace_id, platform, external_sender_id
                        order by coalesce(conversation_updated_at, conversation_created_at) desc
                    ) as rn
                from src
            )
            select
                workspace_id,
                platform,
                external_sender_id,
                sender_name,
                sender_avatar,
                sender_profile_fetched_at,
                gen_random_uuid() as new_customer_id,
                gen_random_uuid() as new_contact_point_id
            from ranked
            where rn = 1;
        `);

        // Step 2: skip tuples that already have a ContactPoint from a prior run.
        this.addSql(`
            update "_customer_backfill" b
            set new_contact_point_id = cp."id",
                new_customer_id = cp."customer_id"
            from "contact_points" cp
            where cp."workspace_id" = b."workspace_id"
              and cp."platform" = b."platform"
              and cp."external_sender_id" = b."external_sender_id";
        `);

        // Step 3: insert new Customers for tuples that didn't already have one.
        this.addSql(`
            insert into "customers" ("id", "workspace_id", "name", "created_at")
            select b."new_customer_id", b."workspace_id", b."sender_name", CURRENT_TIMESTAMP
            from "_customer_backfill" b
            where not exists (
                select 1 from "contact_points" cp
                where cp."workspace_id" = b."workspace_id"
                  and cp."platform" = b."platform"
                  and cp."external_sender_id" = b."external_sender_id"
            );
        `);

        // Step 4: insert new ContactPoints for tuples that didn't already have one.
        this.addSql(`
            insert into "contact_points" (
                "id", "workspace_id", "customer_id", "platform", "external_sender_id",
                "display_sender_name", "sender_avatar", "fetched_at", "created_at"
            )
            select
                b."new_contact_point_id",
                b."workspace_id",
                b."new_customer_id",
                b."platform",
                b."external_sender_id",
                b."sender_name",
                b."sender_avatar",
                b."sender_profile_fetched_at",
                CURRENT_TIMESTAMP
            from "_customer_backfill" b
            where not exists (
                select 1 from "contact_points" cp
                where cp."workspace_id" = b."workspace_id"
                  and cp."platform" = b."platform"
                  and cp."external_sender_id" = b."external_sender_id"
            );
        `);

        // Step 5: link every matching conversation to its ContactPoint.
        // Bring chatbots + accounts in by PK in the FROM list (not via JOIN
        // ON), because Postgres rejects references to the UPDATE target
        // table ("c") inside JOIN ON clauses with the error:
        //   "invalid reference to FROM-clause entry for table c".
        // All equality predicates live in WHERE — the planner still uses
        // the PK indexes on chatbots/accounts and the FK indexes on
        // conversations, so this is no worse than the join shape and
        // avoids the original cross-join (accounts joined on `type`).
        this.addSql(`
            update "conversations" c
            set "contact_point_id" = b."new_contact_point_id"
            from "_customer_backfill" b, "chatbots" cb, "accounts" a
            where c."contact_point_id" is null
              and cb."id" = c."chatbot_id"
              and a."id" = c."account_id"
              and cb."workspace_id" = b."workspace_id"
              and a."type" = b."platform"
              and c."sender_id" = b."external_sender_id";
        `);

        this.addSql(`drop table if exists "_customer_backfill";`);
    }

    override async down(): Promise<void> {
        // Reverse: detach conversations, then drop all backfilled rows.
        // We delete ALL contact_points + customers since this branch owns them
        // (no other code path writes to these tables before this migration).
        this.addSql(`update "conversations" set "contact_point_id" = null;`);
        this.addSql(`delete from "contact_points";`);
        this.addSql(`delete from "customers";`);
    }
}
