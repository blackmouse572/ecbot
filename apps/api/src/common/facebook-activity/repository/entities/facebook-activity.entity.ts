import { ENUM_FACEBOOK_MESSAGE_EVENT_TYPE } from '@app/common/enums/facebook.enum';
import { Entity, Enum, Index, Property } from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

export const FacebookActivityTableName = 'facebook_activities';

/** One webhook event as Facebook delivered it, kept for replay and audit. */
@Entity({ tableName: FacebookActivityTableName })
@Index({ properties: ['pageId'] })
@Index({ properties: ['senderId'] })
@Index({ properties: ['recipientId'] })
export class FacebookActivityEntity extends DatabaseEntityBase {
    @Property({ length: 255 })
    pageId!: string;

    @Property({ length: 255 })
    senderId!: string;

    @Property({ length: 255, nullable: true })
    recipientId?: string;

    @Enum(() => ENUM_FACEBOOK_MESSAGE_EVENT_TYPE)
    eventType!: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE;

    @Property({ length: 255, nullable: true })
    messageId?: string;

    @Property({ type: 'text', nullable: true })
    messageText?: string;

    @Property({ type: 'json', nullable: true })
    eventPayload?: Record<string, any>;

    @Property({ type: 'json', nullable: true })
    webhookPayload?: Record<string, any>;

    @Property({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    @Property({ default: false })
    processed: boolean = false;

    @Property({ type: 'text', nullable: true })
    processingError?: string;

    @Property({ type: 'timestamptz', nullable: true })
    processedAt?: Date;
}
