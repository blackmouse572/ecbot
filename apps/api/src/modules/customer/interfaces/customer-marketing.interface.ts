import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
    ENUM_MARKETING_EVENT_ACTOR,
} from '../enums/customer-marketing.enum';

/** Who made a marketing label change and why; written on its event. */
export interface ICustomerMarketingChangeContext {
    actor: ENUM_MARKETING_EVENT_ACTOR;
    reason?: string;
    conversationId?: string | null;
    messageId?: string | null;
    /** The member, for OPERATOR and CLIENT changes. */
    userId?: string;
    /** The tracked link behind a SOURCE event or an offer opt-in. */
    trackedLinkId?: string;
}

export interface ICustomerMarketingInbound {
    customerId: string;
    workspaceId: string;
    text?: string | null;
    conversationId?: string;
    messageId?: string;
}

/** When the shop may message the customer for free on one channel. */
export interface ICustomerMarketingFreeWindow {
    channel: ENUM_ACCOUNT_TYPE;
    lastInboundAt: Date;
    /** Null: no limit (Telegram). */
    openUntil: Date | null;
}

/** Customers list filters on the marketing labels. */
export interface ICustomerMarketingListFilter {
    stages?: ENUM_CUSTOMER_JOURNEY_STAGE[];
    permissions?: ENUM_CUSTOMER_MARKETING_PERMISSION[];
    dormant?: boolean;
}

/** A customer arriving through a tracked link (`link` is the code they used). */
export interface ICustomerMarketingArrival {
    customerId: string;
    workspaceId: string;
    trackedLinkId: string;
    /** The source's "promises an offer" flag: opts a PENDING customer in. */
    promisesOffer: boolean;
    conversationId?: string;
    messageId?: string;
}
