import { Migration } from '@mikro-orm/migrations';

export class Migration20261111070000_source_stats_index extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create index "customer_marketing_states_first_source_index" on "customer_marketing_states" ("workspace_id", "first_tracked_link_id");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop index "customer_marketing_states_first_source_index";`
        );
    }
}
