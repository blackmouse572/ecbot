import {
    Entity,
    Enum,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_MARKETING_AUDIENCE_MATCH } from '../../enums/marketing-audience.enum';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';
import { IMarketingAudienceCondition } from '../../interfaces/marketing-audience.interface';

export const MarketingSavedAudienceTableName = 'marketing_audiences';

/**
 * A named audience a shop keeps to reuse (#504): a preset, or conditions
 * matched all or any. Who it reaches is worked out at send time.
 */
@Entity({ tableName: MarketingSavedAudienceTableName })
// Audiences are hard-deleted, so the name stays unique without soft-delete gaps.
@Unique({ properties: ['workspace', 'name'] })
export class MarketingSavedAudienceEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({ type: 'varchar', length: 120 })
    name: string;

    @Enum({ items: () => ENUM_MARKETING_TODO, nullable: true })
    preset?: ENUM_MARKETING_TODO | null;

    @Enum({ items: () => ENUM_MARKETING_AUDIENCE_MATCH, nullable: true })
    match?: ENUM_MARKETING_AUDIENCE_MATCH | null;

    @Property({ type: 'jsonb', nullable: true })
    conditions?: IMarketingAudienceCondition[] | null;
}
