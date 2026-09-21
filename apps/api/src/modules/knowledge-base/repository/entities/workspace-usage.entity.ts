import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@Entity({ tableName: 'workspace_usage' })
@Index({ properties: ['workspace'] })
export class WorkspaceUsageEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity, { unique: true })
    workspace: WorkspaceEntity;

    @Property({ default: 0, comment: 'Storage usage in bytes' })
    storageUsage: number = 0;

    @Property({ default: 0, comment: 'Cumulative token usage' })
    tokenUsage: number = 0;

    @Property({ default: 0, comment: 'Total number of documents' })
    documentsCount: number = 0;

    @Property({
        type: 'json',
        nullable: true,
        comment:
            'Detailed metrics breakdown (storageByType, documentsByStatus, etc)',
    })
    metrics?: Record<string, any>;

    @Property({
        nullable: true,
        comment: 'Last update timestamp',
    })
    updatedAt?: Date;
}
