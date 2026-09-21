import {
    Cascade,
    Entity,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { KnowledgeBaseEntity } from './knowledge-base.entity';

@Entity({ tableName: 'knowledge_base_folders' })
@Unique({ properties: ['knowledgeBase', 'slug', 'parentFolder'] })
@Index({ properties: ['knowledgeBase', 'parentFolder'] })
export class KnowledgeItemFolderEntity extends DatabaseEntityBase {
    @ManyToOne(() => KnowledgeBaseEntity, { cascade: [Cascade.ALL] })
    knowledgeBase: KnowledgeBaseEntity;

    @Property({ comment: 'Folder display name' })
    name: string;

    @Property({
        comment: 'URL-friendly slug for folder identification',
    })
    slug: string;

    @ManyToOne(() => KnowledgeItemFolderEntity, {
        nullable: true,
        cascade: [Cascade.ALL],
        comment: 'Parent folder for tree structure hierarchy',
    })
    parentFolder?: KnowledgeItemFolderEntity;

    @Property({ default: true, comment: 'Enable/disable folder visibility' })
    isActive: boolean = true;
}
