import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { CustomerEntity } from 'src/modules/customer/repository/entities/customer.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_MARKETING_MESSAGE_STATUS,
    ENUM_MARKETING_SKIP_REASON,
} from '../../enums/marketing-send.enum';

export const MarketingMessageTableName = 'marketing_messages';

/**
 * One offer to one customer (#505), the ledger the caps and the rest rule
 * count. Only SENT rows use up a customer's quota.
 */
@Entity({ tableName: MarketingMessageTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['customer', 'sentAt'] })
export class MarketingMessageEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    // Erasing a customer erases their offers with them.
    @ManyToOne(() => CustomerEntity, { deleteRule: 'cascade' })
    customer: CustomerEntity;

    @Enum({ items: () => ENUM_ACCOUNT_TYPE, nullable: true })
    channel?: ENUM_ACCOUNT_TYPE | null;

    @Enum({ items: () => ENUM_MARKETING_MESSAGE_STATUS })
    status: ENUM_MARKETING_MESSAGE_STATUS;

    @Enum({ items: () => ENUM_MARKETING_SKIP_REASON, nullable: true })
    skipReason?: ENUM_MARKETING_SKIP_REASON | null;

    /** The shop's calendar day it goes out on, for one offer a day. */
    @Property({ type: 'date' })
    sendDay: string;

    @Property({ type: 'timestamptz', nullable: true })
    sentAt?: Date | null;

    /** The customer's first reply within 72 hours of sentAt. */
    @Property({ type: 'timestamptz', nullable: true })
    repliedAt?: Date | null;
}
