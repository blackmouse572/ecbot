import { ENUM_MARKETING_EVENT_ACTOR } from '../enums/customer-marketing.enum';

/** Who made a marketing label change and why; written on its event. */
export interface ICustomerMarketingChangeContext {
    actor: ENUM_MARKETING_EVENT_ACTOR;
    reason?: string;
    conversationId?: string | null;
    messageId?: string | null;
    /** The member, for OPERATOR and CLIENT changes. */
    userId?: string;
}

export interface ICustomerMarketingInbound {
    customerId: string;
    workspaceId: string;
    text?: string | null;
    conversationId?: string;
    messageId?: string;
}
