import {
    Entity,
    Enum,
    Formula,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_MARKETING_AUDIENCE_EXCLUSION } from '../../enums/marketing-audience.enum';
import {
    ENUM_MARKETING_MESSAGE_STATUS,
    ENUM_MARKETING_SEND_MODE,
} from '../../enums/marketing-send.enum';
import { IMarketingAudience } from '../../interfaces/marketing-audience.interface';

export const MarketingSendTableName = 'marketing_sends';

/** This send's sent offers, for sorting Đã gửi by its results. */
const sentOffers = (alias: string) =>
    `FROM marketing_messages mm WHERE mm.send_id = ${alias}.id AND mm.status = '${ENUM_MARKETING_MESSAGE_STATUS.SENT}' AND mm.deleted_at IS NULL`;

/**
 * One offer a shop sends to an audience (#505): text and an optional
 * picture. Each customer it reaches gets a row in marketing_messages. An
 * AUTO send runs again each day for customers who newly match (#506).
 */
@Entity({ tableName: MarketingSendTableName })
@Index({ properties: ['workspace'] })
export class MarketingSendEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({ type: 'varchar', length: 120, default: '' })
    name: string = '';

    @Enum({
        items: () => ENUM_MARKETING_SEND_MODE,
        default: ENUM_MARKETING_SEND_MODE.ONCE,
    })
    mode: ENUM_MARKETING_SEND_MODE = ENUM_MARKETING_SEND_MODE.ONCE;

    /** Copied at send time, so editing a saved audience changes nothing. */
    @Property({ type: 'jsonb' })
    audience: IMarketingAudience;

    /** May hold {name} and {product}, filled in for each customer. */
    @Property({ type: 'text' })
    text: string;

    @Property({ type: 'text', nullable: true })
    imageUrl?: string | null;

    /** AUTO only: false once the shop turns it off ("Tắt tự gửi"). */
    @Property({ type: 'boolean', default: true })
    active: boolean = true;

    /** The shop day of the last run, "yyyy-MM-dd"; an AUTO send runs once a day. */
    @Property({ type: 'date', nullable: true })
    lastRunDay?: string | null;

    /** Who matched but was left out at the first run, by reason. */
    @Property({ type: 'jsonb', default: '{}' })
    excluded: Partial<Record<ENUM_MARKETING_AUDIENCE_EXCLUSION, number>> = {};

    /** Sort keys only (lazy): the list reads the numbers from statsBySend. */
    @Formula(a => `(SELECT count(*) ${sentOffers(a.alias)})`, { lazy: true })
    sent?: number;

    @Formula(
        a =>
            `(SELECT count(*) FILTER (WHERE mm.replied_at IS NOT NULL)::float / greatest(count(*), 1) ${sentOffers(a.alias)})`,
        { lazy: true }
    )
    replyRate?: number;

    /** Never-sent sends get the epoch, so they sort last when newest first. */
    @Formula(
        a =>
            `(SELECT coalesce(max(mm.sent_at), 'epoch'::timestamptz) ${sentOffers(a.alias)})`,
        { lazy: true }
    )
    lastSentAt?: Date;
}
