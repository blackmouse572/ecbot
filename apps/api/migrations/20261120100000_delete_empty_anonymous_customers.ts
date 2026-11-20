import { Migration } from '@mikro-orm/migrations';

/**
 * Website widget and API channel visitors used to become a Customer on their
 * first message, with nothing to show: no name, phone or email. They now
 * become one only once they share something (ANONYMOUS_CHANNELS), so this
 * removes the empty ones already recorded.
 *
 * A customer is removed only when every contact point is on one of those
 * channels and nothing was ever kept about them: no name, phone, email,
 * notes, custom fields, labels, orders or merge history. Their conversations
 * stay in the inbox, unlinked (contact_point_id is ON DELETE SET NULL);
 * marketing state, events and product reactions go with them (CASCADE).
 *
 * Not reversible: down() is a no-op.
 */
export class Migration20261120100000_delete_empty_anonymous_customers extends Migration {
    override async up(): Promise<void> {
        // One statement, so the contact points and their customers go
        // together (the contact point FK is checked at the statement's end).
        this.addSql(`
            with "targets" as (
                select c.id from "customers" c
                where nullif(trim(c.name), '') is null
                  and nullif(trim(c.phone), '') is null
                  and nullif(trim(c.email), '') is null
                  and nullif(trim(c.notes), '') is null
                  and (c.metadata is null or c.metadata = '{}'::jsonb)
                  and c.merged_into_customer_id is null
                  and exists (select 1 from "contact_points" cp where cp.customer_id = c.id)
                  and not exists (
                      select 1 from "contact_points" cp
                      where cp.customer_id = c.id
                        and cp.platform not in ('WEBSITE_WIDGET', 'API_CHANNEL')
                  )
                  and not exists (select 1 from "customers" m where m.merged_into_customer_id = c.id)
                  and not exists (select 1 from "orders" o where o.customer_id = c.id)
                  and not exists (select 1 from "customer_tag_assignments" t where t.customer_id = c.id)
                  and not exists (
                      select 1 from "customer_merge_suggestions" s
                      where s.customer_a_id = c.id or s.customer_b_id = c.id
                  )
            ),
            "removed_contact_points" as (
                delete from "contact_points"
                where customer_id in (select id from "targets")
            )
            delete from "customers" where id in (select id from "targets");
        `);
    }

    override async down(): Promise<void> {
        // Deleted rows cannot be restored.
    }
}
