import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import {
    BigIntType,
    Collection,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_CHATBOT_STATUS,
    ENUM_CHATBOT_TYPE,
} from '../../enums/chatbot.enum';

export const ChatbotTableName = 'chatbots';

@Entity({ tableName: ChatbotTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['status'] })
@Index({ properties: ['type'] })
export class ChatbotEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 255 })
    name: string;

    @Property({ type: 'varchar', length: 500, nullable: true })
    avatar?: string;

    @Property({ type: 'text', nullable: true })
    generalKnowledge?: string;

    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @OneToMany(() => AccountEntity, account => account.chatbot, { lazy: true })
    accounts = new Collection<AccountEntity>(this);

    @Property({ type: 'boolean', default: true })
    typingIndicator: boolean = true;

    @Property({ type: 'boolean', default: true })
    autoRead: boolean = true;

    @Property({ type: 'varchar', length: 100 })
    status: ENUM_CHATBOT_STATUS = ENUM_CHATBOT_STATUS.ACTIVE;

    @Property({ type: 'varchar', length: 100 })
    type: ENUM_CHATBOT_TYPE = ENUM_CHATBOT_TYPE.BEAUTY;

    @Property({ type: 'text', nullable: false })
    primaryLanguage: string;

    @Property({
        type: 'text',
        nullable: true,
        comment:
            'Language to switch to when user not use primary language (e.g english)',
    })
    deferedLanguage?: string;

    @Property({
        type: 'text',
        nullable: true,
        comment: 'Welcome message sent to users when they start a chat',
    })
    welcomeMessage?: string;

    @Property({
        type: 'text',
        nullable: true,
        comment: 'Fallback message when the bot cannot answer',
    })
    fallbackMessage?: string;

    @Property({ type: 'text', nullable: false })
    modelProvider: string;

    @Property({ type: 'text', nullable: false })
    modelTextName: string;

    @Property({ type: 'float', default: 1.0 })
    modelTemperature: number = 1.0;

    @Property({ type: 'int', nullable: true })
    maxTokens?: number;

    // Handoff configuration (always active by default)
    @Property({ type: 'int', default: 3 })
    handoffFallbackThreshold: number = 3;

    @Property({ type: 'text', nullable: true })
    handoffMessage?: string;

    @Property({ type: 'array', nullable: true })
    handoffKeywords?: string[];

    // Guardrail configuration
    @Property({ type: 'boolean', default: false })
    guardrailEnabled: boolean = false;

    @Property({ type: 'boolean', default: false })
    guardrailModelEnabled: boolean = false;

    @Property({ type: 'text', nullable: true })
    guardrailCustomInstruction?: string;

    @Property({ type: 'boolean', default: true })
    guardrailEscalateOnBlock: boolean = true;

    @Property({ type: 'text', nullable: true })
    followupRules?: string;

    // Token budget caps — null means uncapped, and the guard skips the query
    // entirely rather than summing usage for nothing.
    @Property({ type: new BigIntType('number'), nullable: true })
    dailyTokenCap?: number;

    @Property({ type: new BigIntType('number'), nullable: true })
    monthlyTokenCap?: number;
}
