import {
    BigIntType,
    Entity,
    Enum,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_MARKETING_BACKFILL_STATUS } from '../../enums/customer-marketing.enum';

export const MarketingBackfillRunTableName = 'marketing_backfill_runs';

/**
 * A workspace's one 90-day marketing backfill (#500). The cursor is the last
 * conversation read (newest first), so starting it again resumes there and
 * no conversation is read twice. Budget values are quota units.
 */
@Entity({ tableName: MarketingBackfillRunTableName })
@Unique({ properties: ['workspace'] })
export class MarketingBackfillRunEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity, { deleteRule: 'cascade' })
    workspace: WorkspaceEntity;

    @Enum(() => ENUM_MARKETING_BACKFILL_STATUS)
    status: ENUM_MARKETING_BACKFILL_STATUS;

    // Conversations with a message after this are read.
    @Property({ type: 'timestamptz' })
    since: Date;

    @Property({ type: 'integer', default: 0 })
    total: number = 0;

    @Property({ type: 'integer', default: 0 })
    processed: number = 0;

    @Property({ type: 'timestamptz', nullable: true })
    cursorAt?: Date | null;

    @Property({ type: 'uuid', nullable: true })
    cursorId?: string | null;

    // Tokens left when it (re)started, and the level it must not go below.
    // Null without a meter (open edition): no cap.
    @Property({ type: new BigIntType('number'), nullable: true })
    budgetStart?: number | null;

    @Property({ type: new BigIntType('number'), nullable: true })
    budgetFloor?: number | null;

    // `processed` when it (re)started, to measure the cost per conversation.
    @Property({ type: 'integer', default: 0 })
    processedAtStart: number = 0;

    @Property({ type: 'timestamptz', nullable: true })
    finishedAt?: Date | null;
}
