import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql';
import { KnowledgeItemEntity } from './knowledge-item.entity';

/**
 * A single text chunk produced by the AI chunking pipeline.
 * Embeddings are stored as pgvector ``vector(768)`` for similarity search.
 */
@Entity({ tableName: 'knowledge_item_chunks' })
@Index({ properties: ['knowledgeBaseItem', 'chunkIndex'] })
export class KnowledgeItemChunkEntity {
    @Property({
        type: 'uuid',
        defaultRaw: 'gen_random_uuid()',
        primary: true,
    })
    id: string;

    @Property({ type: 'timestamptz', defaultRaw: 'CURRENT_TIMESTAMP' })
    createdAt: Date = new Date();

    @ManyToOne(() => KnowledgeItemEntity, { deleteRule: 'cascade' })
    knowledgeBaseItem: KnowledgeItemEntity;

    @Property({
        type: 'text',
        comment: 'Text content of this chunk',
    })
    content: string;

    @Property({
        type: 'any',
        columnType: 'vector(768)',
        nullable: true,
        comment: 'Vector embedding (768-dim, gemini-embedding-001)',
    })
    embedding?: number[];

    @Property({
        type: 'integer',
        comment: 'Zero-based position of this chunk within the parent item',
    })
    chunkIndex: number;

    @Property({
        type: 'integer',
        nullable: true,
        comment: 'Source page number for FILE/PDF items (null for TEXT/URL)',
    })
    pageIndex?: number;

    @Property({
        type: 'varchar',
        length: 2048,
        nullable: true,
        comment: 'Source URL for URL items or individual crawled pages',
    })
    url?: string;
}
