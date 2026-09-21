import { Entity, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@Entity({ tableName: 'knowledge_bases' })
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
