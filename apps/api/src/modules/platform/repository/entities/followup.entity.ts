import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_FOLLOWUP_STATUS } from '../../constants/followup.constant';

export const FollowupTableName = 'followups';

/**
 * Lifecycle record for a proactive followup. Cloud Tasks only holds the
 * pending timer; this row is the source of truth for listing, cancelling and
 * for knowing what happened after the task fired.
 */
@Entity({ tableName: FollowupTableName })
@Index({ properties: ['chatbot', 'status'] })
@Index({ properties: ['conversation'] })
@Index({ properties: ['scheduledAt'] })
export class FollowupEntity extends DatabaseEntityBase {
    @ManyToOne(() => ChatbotEntity)
    chatbot: ChatbotEntity;

    @ManyToOne(() => ConversationEntity)
    conversation: ConversationEntity;

    @Property({ type: 'text' })
    prompt: string;

    @Property({ type: 'text' })
    reason: string;

    /** No FK — the message may be hard-deleted while the log survives. */
    @Property({ type: 'uuid', nullable: true })
    triggerMessageId?: string;

    @Enum(() => ENUM_FOLLOWUP_STATUS)
    status: ENUM_FOLLOWUP_STATUS = ENUM_FOLLOWUP_STATUS.SCHEDULED;

    @Property({ type: 'timestamptz' })
    scheduledAt: Date;

    @Property({ type: 'timestamptz', nullable: true })
    firedAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    cancelledAt?: Date;

    /** Skip reason enum value, or the truncated error message when FAILED. */
    @Property({ type: 'varchar', length: 255, nullable: true })
    outcomeReason?: string;

    /** Cloud Tasks delivery attempts — the queue retries up to 3 times. */
    @Property({ type: 'int', default: 0 })
    attempts: number = 0;
}
