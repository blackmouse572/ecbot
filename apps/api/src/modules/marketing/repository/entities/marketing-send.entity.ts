import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { IMarketingAudience } from '../../interfaces/marketing-audience.interface';

export const MarketingSendTableName = 'marketing_sends';

/**
 * One offer a shop sends to an audience (#505): fixed text and an optional
 * picture. Each customer it reaches gets a row in marketing_messages.
 */
@Entity({ tableName: MarketingSendTableName })
@Index({ properties: ['workspace'] })
export class MarketingSendEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    /** Copied at send time, so editing a saved audience changes nothing. */
    @Property({ type: 'jsonb' })
    audience: IMarketingAudience;

    @Property({ type: 'text' })
    text: string;

    @Property({ type: 'text', nullable: true })
    imageUrl?: string | null;
}
