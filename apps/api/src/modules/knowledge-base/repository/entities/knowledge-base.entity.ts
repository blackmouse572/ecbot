import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@Entity({ tableName: 'knowledge_bases' })
// A workspace has exactly one live knowledge base: the app only shows one.
@Unique({
    name: 'knowledge_bases_workspace_id_live_unique',
    expression:
        'create unique index "knowledge_bases_workspace_id_live_unique" on "knowledge_bases" ("workspace_id") where "deleted_at" is null',
})
export class KnowledgeBaseEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property()
    name: string;

    @Property({ nullable: true, type: 'text' })
    description?: string;

    @Property({ default: true })
    isActive: boolean = true;

    @Property({ type: 'json', nullable: true })
    settings?: Record<string, any>;
}
