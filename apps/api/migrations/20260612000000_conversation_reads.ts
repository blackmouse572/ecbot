import { Migration } from '@mikro-orm/migrations';

export class Migration20260612000000_conversation_reads extends Migration {
    override async up(): Promise<void> {
        // Idempotent: table may already exist in DB with audit columns added by PR #201
        this.addSql(`
            CREATE TABLE IF NOT EXISTS "conversation_reads" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "deleted" boolean NOT NULL DEFAULT false,
                "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "created_by_id" uuid NULL,
                "updated_at" timestamptz NULL,
                "updated_by_id" uuid NULL,
                "deleted_at" timestamptz NULL,
                "deleted_by_id" uuid NULL,
                "operator_id" varchar(255) NOT NULL,
                "conversation_id" uuid NOT NULL,
                "last_read_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("id")
            );
        `);

        this.addSql(`
            CREATE UNIQUE INDEX IF NOT EXISTS "conversation_reads_operator_conversation_unique"
            ON "conversation_reads" ("operator_id", "conversation_id");
        `);

        this.addSql(`
            CREATE INDEX IF NOT EXISTS "conversation_reads_deleted_index"
            ON "conversation_reads" ("deleted");
        `);

        this.addSql(`
            CREATE INDEX IF NOT EXISTS "conversation_reads_created_at_index"
            ON "conversation_reads" ("created_at");
        `);

        this.addSql(`
            CREATE INDEX IF NOT EXISTS "conversation_reads_updated_at_index"
            ON "conversation_reads" ("updated_at");
        `);

        this.addSql(`
            CREATE INDEX IF NOT EXISTS "conversation_reads_deleted_at_index"
            ON "conversation_reads" ("deleted_at");
        `);

        this.addSql(`
            CREATE INDEX IF NOT EXISTS "conversation_reads_conversation_id_index"
            ON "conversation_reads" ("conversation_id");
        `);

        this.addSql(`
            CREATE INDEX IF NOT EXISTS "conversation_reads_operator_id_index"
            ON "conversation_reads" ("operator_id");
        `);

        // FK constraints — ignore if already exist
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads"
                    ADD CONSTRAINT "conversation_reads_conversation_id_foreign"
                    FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id")
                    ON UPDATE CASCADE ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);

        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads"
                    ADD CONSTRAINT "conversation_reads_created_by_id_foreign"
                    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id")
                    ON UPDATE CASCADE ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);

        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads"
                    ADD CONSTRAINT "conversation_reads_updated_by_id_foreign"
                    FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id")
                    ON UPDATE CASCADE ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);

        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads"
                    ADD CONSTRAINT "conversation_reads_deleted_by_id_foreign"
                    FOREIGN KEY ("deleted_by_id") REFERENCES "users" ("id")
                    ON UPDATE CASCADE ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);

        // Seed: mark existing conversations as read for all workspace members
        this.addSql(`
            INSERT INTO "conversation_reads" (
                "id", "operator_id", "conversation_id", "last_read_at", "created_at"
            )
            SELECT
                gen_random_uuid(), wm."user_id", c."id", NOW(), NOW()
            FROM "conversations" c
            JOIN "chatbots" cb ON cb."id" = c."chatbot_id"
            JOIN "workspaces" w ON w."id" = cb."workspace_id"
            JOIN "workspace_members" wm ON wm."workspace_id" = w."id"
            WHERE c."deleted_at" IS NULL AND wm."deleted_at" IS NULL
            ON CONFLICT DO NOTHING;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "conversation_reads";`);
    }
}
