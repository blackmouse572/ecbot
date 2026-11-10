import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Rel,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AccountEntity } from 'src/modules/account/repository/entities/account.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_TRACKED_LINK_KIND,
    ENUM_TRACKED_LINK_STATUS,
} from '../../enums/tracked-link.enum';

export const TrackedLinkTableName = 'tracked_links';

/**
 * A customer source: a link or QR code that tells which post, QR, KOL or ad
 * brought a customer in. Child rows (QR, KOL) share the parent's channel,
 * greeting and tags, but carry their own code.
 */
@Entity({ tableName: TrackedLinkTableName })
@Index({ properties: ['workspace', 'parent'] })
@Unique({ properties: ['workspace', 'code'] })
export class TrackedLinkEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: Rel<WorkspaceEntity>;

    @ManyToOne(() => TrackedLinkEntity, { nullable: true })
    parent?: Rel<TrackedLinkEntity> | null;

    @ManyToOne(() => AccountEntity)
    account: Rel<AccountEntity>;

    @Enum({ items: () => ENUM_TRACKED_LINK_KIND })
    kind: ENUM_TRACKED_LINK_KIND = ENUM_TRACKED_LINK_KIND.LINK;

    @Enum({ items: () => ENUM_TRACKED_LINK_STATUS })
    status: ENUM_TRACKED_LINK_STATUS = ENUM_TRACKED_LINK_STATUS.ACTIVE;

    @Property({ type: 'varchar', length: 120 })
    name: string;

    /** The ref / start payload, e.g. "to-roi-tet". */
    @Property({ type: 'varchar', length: 64 })
    code: string;

    /** What the bot says first when a customer arrives through this source. */
    @Property({ type: 'text', nullable: true })
    greeting?: string | null;

    /** Customer tags applied to everyone who arrives through this source. */
    @Property({ type: 'jsonb', default: '[]' })
    tagIds: string[] = [];

    /** The link promises an offer, so arriving through it opts the customer in. */
    @Property({ type: 'boolean', default: false })
    promisesOffer: boolean = false;

    /** Website only: the shop page the widget runs on. */
    @Property({ type: 'text', nullable: true })
    targetUrl?: string | null;
}
