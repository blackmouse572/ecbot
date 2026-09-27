import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
    ENUM_MESSAGE_STATUS,
} from '../../enums/message.enum';
import { ConversationEntity } from './conversation.entity';
import { IMessageAttachment } from '../../interfaces/message-media.interface';
import { MessageAttachmentsType } from '../types/message-attachments.type';

export const MessageTableName = 'messages';

export type MessageReaction = {
    emoji: string;
    actorType: 'customer' | 'operator' | 'bot';
    actorId?: string;
    externalId?: string;
    at: string;
};

@Entity({ tableName: MessageTableName })
@Index({ properties: ['conversation'] })
@Index({ properties: ['externalId'] })
@Index({ properties: ['clientNonce'] })
@Index({ properties: ['dateSent'] })
@Unique({
    name: 'UQ_messages_conversation_externalId',
    properties: ['conversation', 'externalId'],
})
export class MessageEntity extends DatabaseEntityBase {
    @ManyToOne(() => ConversationEntity)
    conversation: ConversationEntity;

    @Enum(() => ENUM_MESSAGE_DIRECTION)
    direction: ENUM_MESSAGE_DIRECTION;

    @Enum(() => ENUM_MESSAGE_AUTHOR)
    authorType: ENUM_MESSAGE_AUTHOR;

    @Property({ type: 'varchar', length: 255 })
    authorId: string;

    @Property({ type: 'varchar', length: 255, nullable: true })
    externalId?: string;

    @Property({ type: 'uuid', nullable: true })
    clientNonce?: string;

    @Property({ type: 'text', nullable: true })
    text?: string;

    @Property({
        type: MessageAttachmentsType,
        columnType: 'jsonb',
        nullable: true,
    })
    attachments?: IMessageAttachment[];

    @Property({ type: 'jsonb', nullable: true })
    raw?: unknown;

    @Property({ type: 'jsonb', nullable: true })
    reactions?: MessageReaction[];

    @Property({ type: 'timestamptz' })
    dateSent: Date;

    @Enum({ items: () => ENUM_MESSAGE_STATUS, nullable: true })
    status?: ENUM_MESSAGE_STATUS;
}
