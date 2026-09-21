import {
    Cascade,
    Collection,
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    OneToMany,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AwsS3Entity } from 'src/modules/aws/repository/entities/aws.s3.entity';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';
import { KnowledgeBaseEntity } from './knowledge-base.entity';
import { KnowledgeItemFolderEntity } from './knowledge-item-folder.entity';
import { KnowledgeItemTagEntity } from './knowledge-item-tag.entity';

@Entity({ tableName: 'knowledge_base_items' })
@Index({ properties: ['knowledgeBase', 'type'] })
@Index({ properties: ['knowledgeBase', 'status'] })
@Index({ properties: ['knowledgeBase'] })
@Index({ properties: ['status'] })
export class KnowledgeItemEntity extends DatabaseEntityBase {
    @ManyToOne(() => KnowledgeBaseEntity)
    knowledgeBase: KnowledgeBaseEntity;

    @Enum(() => ENUM_KNOWLEDGE_BASE_ITEM_TYPE)
    type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE;

    @Property({
        comment:
            'Title/name of the knowledge item. For FILE: filename, URL: page title, TEXT: content title',
    })
    title: string;

    @Property({
        type: 'text',
        nullable: true,
        comment:
            'Content storage. For FILE: extracted text, URL: URL string, TEXT: raw text content',
    })
    content?: string;

    @ManyToOne(() => KnowledgeItemFolderEntity, {
        nullable: true,
        comment: 'Folder organization reference',
    })
    folder?: KnowledgeItemFolderEntity;

    @OneToMany(() => KnowledgeItemTagEntity, tag => tag.knowledgeItem, {
        orphanRemoval: true,
        cascade: [Cascade.ALL],
    })
    tags = new Collection<KnowledgeItemTagEntity>(this);

    @Property({
        type: 'json',
        nullable: true,
        comment:
            'Type-specific metadata: FILE={fileName, mimeType}, URL={url, processingMethod, crawlDepth}, TEXT={sourceLink}',
    })
    metadata?: Record<string, any>;

    @Embedded(() => AwsS3Entity, {
        nullable: true,
        comment: 'For FILE type: AWS S3 attachment info (key, size, mime, url)',
    })
    attachment?: AwsS3Entity;

    @Enum(() => ENUM_KNOWLEDGE_BASE_ITEM_STATUS)
    status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS =
        ENUM_KNOWLEDGE_BASE_ITEM_STATUS.DRAFT;

    @Property({
        type: 'text',
        nullable: true,
        comment: 'Error details if status is FAILED',
    })
    errorMessage?: string | null;

    @Property({
        nullable: true,
        comment: 'When AI processing was completed',
    })
    processedAt?: Date;

    /**
     * Get tags as an array of strings for responses/queries
     */
    get tagArray(): string[] {
        if (!this.tags.isInitialized()) {
            return [];
        }
        return this.tags.getItems().map(t => t.tag);
    }
}
