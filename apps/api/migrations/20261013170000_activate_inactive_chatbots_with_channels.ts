import { Migration } from '@mikro-orm/migrations';

// An inactive agent used to answer on its linked channels anyway: inbound
// messages never checked the agent's status. Now they do, so a turned-off
// agent stays quiet. Agents that are inactive today but already linked to a
// channel have been answering customers, so turn them on to keep those shops
// answering. Agents with no channel stay drafts.
export class Migration20261013170000_activate_inactive_chatbots_with_channels extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            update "chatbots" c
            set "status" = 'active', "updated_at" = now()
            where c."status" = 'inactive'
              and c."deleted_at" is null
              and exists (
                  select 1 from "accounts" a
                  where a."chatbot_id" = c."id"
                    and a."deleted_at" is null
              );
        `);
    }

    override async down(): Promise<void> {
        // Which agents this turned on is not recorded, and an owner may have
        // changed them since, so rollback leaves statuses as they are.
    }
}
