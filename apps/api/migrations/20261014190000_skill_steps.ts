import { Migration } from '@mikro-orm/migrations';

// Skills can be written as structured steps (Ask, If, Tool, Say, Tell) and
// carry guardrails. Both compile into the same S3 body `load_skill` reads, so
// existing skills keep working as CONTENT with no backfill.
export class Migration20261014190000_skill_steps extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "skills" add column if not exists "format" text check ("format" in ('CONTENT', 'STEPS')) not null default 'CONTENT', add column if not exists "steps" jsonb null, add column if not exists "guardrails" jsonb not null default '[]', add column if not exists "instructions" text null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "skills" drop column if exists "format", drop column if exists "steps", drop column if exists "guardrails", drop column if exists "instructions";`
        );
    }
}
