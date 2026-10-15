import { Migration } from '@mikro-orm/migrations';

// Admins can suspend a workspace: its members are locked out and its agents
// stop answering. Every existing workspace stays active.
export class Migration20261015110415_add_workspace_status extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "workspaces" add column "status" text check ("status" in ('ACTIVE', 'SUSPENDED')) not null default 'ACTIVE';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "workspaces" drop column "status";`);
    }
}
