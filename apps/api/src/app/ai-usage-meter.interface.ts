// Placement rule: a seam with consumers in more than one module lives here,
// in src/app/; a seam with a single consumer lives in that module's
// interfaces/ (e.g. the workspace-created hook).
import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { TokenUsageDelta } from 'src/modules/chatbot/interfaces/token-usage-wire.interface';

export const AI_USAGE_METER = Symbol('AI_USAGE_METER');

/** Which part of the product burned the tokens. */
export enum ENUM_AI_USAGE_SOURCE {
    /** A bot reply to a customer on a connected channel. */
    PLATFORM_REPLY = 'PLATFORM_REPLY',
    /** A scheduled follow-up message. */
    FOLLOWUP = 'FOLLOWUP',
    /** The embedded website widget. */
    WIDGET = 'WIDGET',
    /** An operator testing the bot in the console. */
    PREVIEW = 'PREVIEW',
}

/** The chatbot fields a meter reads — structural, so any chatbot-shaped
 *  object works without dragging the entity through tests. */
export interface AiUsageMeterChatbot {
    id: string;
    dailyTokenCap?: number;
    monthlyTokenCap?: number;
}

export interface AiUsageDecision {
    allowed: boolean;
    reason?: string;
}

export interface AiUsageRecord {
    workspaceId: string;
    usage: TokenUsageDelta;
    source: ENUM_AI_USAGE_SOURCE;
    chatbotId?: string;
    accountId?: string;
    platform?: ENUM_ACCOUNT_TYPE;
    model?: string;
    conversationId?: string;
}

/**
 * Metering seam. Absent in the public build: every LLM turn is allowed and
 * nothing is recorded. Provided by the token-usage module (Ecbot Cloud).
 */
export interface AiUsageMeter {
    check(
        workspaceId: string,
        chatbot: AiUsageMeterChatbot
    ): Promise<AiUsageDecision>;
    /** Never throws: it runs on the tail of a reply already delivered to a customer. */
    record(record: AiUsageRecord): Promise<void>;
}
