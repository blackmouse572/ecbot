import {
    Cascade,
    Entity,
    Index,
    ManyToOne,
    Property,
    Rel,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { KnowledgeItemEntity } from './knowledge-item.entity';

@Entity({ tableName: 'knowledge_item_tags' })
@Unique({ properties: ['knowledgeItem', 'tag'] })
@Index({ properties: ['tag'] })
export class KnowledgeItemTagEntity extends DatabaseEntityBase {
    @ManyToOne(() => 'KnowledgeItemEntity', {
        cascade: [Cascade.PERSIST, Cascade.MERGE],
    })
    knowledgeItem: Rel<KnowledgeItemEntity>;

    @Property({ comment: 'Tag name for flexible item categorization' })
    tag: string;
}
