import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { ENUM_CONVERSATION_STATUS } from '../../enums/conversation.enum';

export const ConversationTableName = 'conversations';

@Entity({ tableName: ConversationTableName })
@Index({ properties: ['chatbot'] })
@Index({ properties: ['account'] })
@Index({ properties: ['status'] })
@Index({ properties: ['senderId'] })
@Index({ properties: ['contactPoint'] })
@Unique({ properties: ['chatbot', 'account', 'senderId'] })
export class ConversationEntity extends DatabaseEntityBase {
    @ManyToOne(() => ChatbotEntity)
    chatbot: ChatbotEntity;

    @ManyToOne(() => AccountEntity)
    account: AccountEntity;

    @ManyToOne(() => ContactPointEntity, { nullable: true })
    contactPoint?: ContactPointEntity;

    @Property({ type: 'varchar', length: 255 })
    senderId: string;

    @Enum(() => ENUM_CONVERSATION_STATUS)
    status: ENUM_CONVERSATION_STATUS = ENUM_CONVERSATION_STATUS.OPEN;

    @Property({ type: 'boolean', default: true })
    botEnabled: boolean = true;

    @Property({ type: 'int', default: 0 })
    fallbackCount: number = 0;

    @Property({ type: 'timestamptz', nullable: true })
    handoffAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    resolvedAt?: Date;

    @Property({ type: 'timestamptz', nullable: true })
    lastMessageAt?: Date;

    @Property({ type: 'text', nullable: true })
    handoffReason?: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    senderName?: string;

    @Property({ type: 'text', nullable: true })
    senderAvatar?: string;

    @Property({ type: 'timestamptz', nullable: true })
    senderProfileFetchedAt?: Date;
}
