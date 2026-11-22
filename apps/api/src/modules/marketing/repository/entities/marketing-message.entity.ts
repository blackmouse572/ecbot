import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { ConversationEntity } from 'src/modules/conversation/repository/entities/conversation.entity';
import { CustomerEntity } from 'src/modules/customer/repository/entities/customer.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_MARKETING_MESSAGE_STATUS,
    ENUM_MARKETING_SKIP_REASON,
} from '../../enums/marketing-send.enum';
import { MarketingSendEntity } from './marketing-send.entity';

export const MarketingMessageTableName = 'marketing_messages';

/**
 * One offer to one customer (#505), the ledger the caps and the rest rule
 * count. Only SENT rows use up a customer's quota.
 */
@Entity({ tableName: MarketingMessageTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['customer', 'sentAt'] })
@Index({ properties: ['send'] })
// One offer a day: a second QUEUED or SENT row for the same customer and day
// is refused, whichever send it comes from.
@Index({
    name: 'marketing_messages_customer_id_send_day_unique',
    expression: `create unique index "marketing_messages_customer_id_send_day_unique" on "marketing_messages" ("customer_id", "send_day") where "status" in ('QUEUED', 'SENT')`,
})
export class MarketingMessageEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => MarketingSendEntity, { deleteRule: 'cascade' })
    send: MarketingSendEntity;

    /** Where it goes: the customer's last conversation on the channel. */
    @ManyToOne(() => ConversationEntity, {
        nullable: true,
        deleteRule: 'set null',
    })
    conversation?: ConversationEntity | null;

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
