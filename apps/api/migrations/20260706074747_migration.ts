import { Migration } from '@mikro-orm/migrations';

export class Migration20260706074747 extends Migration {
    override async up(): Promise<void> {
        // Drop legacy rag_document_chunks FK (old name, no ON UPDATE/DELETE in entity)
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "rag_document_chunks" DROP CONSTRAINT "rag_document_chunks_document_id_fkey";
            EXCEPTION WHEN undefined_object OR undefined_table THEN NULL; END $$;
        `);

        // Re-create conversation_reads FK with ON UPDATE CASCADE ON DELETE CASCADE
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_conversation_id_foreign";
            EXCEPTION WHEN undefined_object THEN NULL; END $$;
        `);
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads"
                    ADD CONSTRAINT "conversation_reads_conversation_id_foreign"
                    FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id")
                    ON UPDATE CASCADE ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);

        // workspace_members.joined_at — idempotent type + default fix
        this.addSql(
            `ALTER TABLE "workspace_members" ALTER COLUMN "joined_at" TYPE timestamptz USING ("joined_at"::timestamptz);`
        );
        this.addSql(
            `ALTER TABLE "workspace_members" ALTER COLUMN "joined_at" SET DEFAULT now();`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_conversation_id_foreign";
            EXCEPTION WHEN undefined_object THEN NULL; END $$;
        `);
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "conversation_reads"
                    ADD CONSTRAINT "conversation_reads_conversation_id_foreign"
                    FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id")
                    ON UPDATE CASCADE ON DELETE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
        this.addSql(`
            DO $$ BEGIN
                ALTER TABLE "rag_document_chunks"
                    ADD CONSTRAINT "rag_document_chunks_document_id_fkey"
                    FOREIGN KEY ("document_id") REFERENCES "rag_documents" ("id")
                    ON UPDATE NO ACTION ON DELETE CASCADE;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
    }
}
