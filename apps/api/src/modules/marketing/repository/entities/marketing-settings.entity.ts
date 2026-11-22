import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { MARKETING_SETTINGS_DEFAULT as D } from '../../constants/marketing-send.constant';

export const MarketingSettingsTableName = 'marketing_settings';

/**
 * Cài đặt gửi tin (#505), one row per workspace once the shop saves it;
 * until then the defaults apply.
 */
@Entity({ tableName: MarketingSettingsTableName })
@Unique({ properties: ['workspace'] })
export class MarketingSettingsEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({
        type: 'smallint',
        fieldName: 'max_per_30_days',
        default: D.maxPer30Days,
    })
    maxPer30Days: number = D.maxPer30Days;

    @Property({ type: 'smallint', default: D.restAfter })
    restAfter: number = D.restAfter;

    @Property({ type: 'smallint', default: D.restDays })
    restDays: number = D.restDays;

    @Property({ type: 'varchar', length: 5, default: D.sendFrom })
    sendFrom: string = D.sendFrom;

    @Property({ type: 'varchar', length: 5, default: D.sendTo })
    sendTo: string = D.sendTo;

    /** Whole messages that opt a customer out; null keeps the built-in words. */
    @Property({ type: 'jsonb', nullable: true })
    stopKeywords?: string[] | null;

    /** The confirmation sent back; null keeps the built-in text. */
    @Property({ type: 'text', nullable: true })
    stopReply?: string | null;
}
