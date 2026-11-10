import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../../enums/customer-marketing.enum';
import { CustomerEntity } from './customer.entity';
import { TrackedLinkEntity } from './tracked-link.entity';

export const CustomerMarketingStateTableName = 'customer_marketing_states';

/**
 * A Customer's marketing labels, one row each: journey stage, messaging
 * permission and the "Khó chịu" flag. Free tags stay in customer_tags. Every
 * change also writes a marketing_events row saying who and why.
 */
@Entity({ tableName: CustomerMarketingStateTableName })
@Unique({ properties: ['customer'] })
@Index({ properties: ['workspace', 'stage'] })
@Index({ properties: ['workspace', 'permission'] })
export class CustomerMarketingStateEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    // Erasing a customer erases their marketing state with them.
    @ManyToOne(() => CustomerEntity, { deleteRule: 'cascade' })
    customer: CustomerEntity;

    @Enum({
        items: () => ENUM_CUSTOMER_JOURNEY_STAGE,
        default: ENUM_CUSTOMER_JOURNEY_STAGE.NEW,
    })
    stage: ENUM_CUSTOMER_JOURNEY_STAGE = ENUM_CUSTOMER_JOURNEY_STAGE.NEW;

    @Enum({
        items: () => ENUM_CUSTOMER_MARKETING_PERMISSION,
        default: ENUM_CUSTOMER_MARKETING_PERMISSION.PENDING,
    })
    permission: ENUM_CUSTOMER_MARKETING_PERMISSION =
        ENUM_CUSTOMER_MARKETING_PERMISSION.PENDING;

    // Set with PAUSED only: offers may resume after this date.
    @Property({ type: 'timestamptz', nullable: true })
    permissionUntil?: Date | null;

    // "Khó chịu": never enters a marketing audience.
    @Property({ type: 'boolean', default: false })
    hostile: boolean = false;

    // The agent asks for consent once; set when it did.
    @Property({ type: 'timestamptz', nullable: true })
    consentAskedAt?: Date | null;

    // For "Ngủ đông", computed when read.
    @Property({ type: 'timestamptz', nullable: true })
    lastInboundAt?: Date | null;

    // Nguồn đầu tiên: the tracked link (a source, or one of its QR or KOL
    // codes) the customer first arrived through. Set once.
    @ManyToOne(() => TrackedLinkEntity, {
        nullable: true,
        deleteRule: 'set null',
    })
    firstTrackedLink?: TrackedLinkEntity | null;

    @Property({ type: 'timestamptz', nullable: true })
    firstSourceAt?: Date | null;
}
