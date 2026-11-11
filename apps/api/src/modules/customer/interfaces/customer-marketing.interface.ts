import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import type { CustomerProductReactionEntity } from '../repository/entities/customer-product-reaction.entity';
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

/** What an event links to, besides the conversation and message. */
export interface IMarketingEventInput extends ICustomerMarketingChangeContext {
    oldValue: string | null;
    newValue: string | null;
    orderId?: string;
    productGroupId?: string | null;
    /** When it happened, if not now (a message read by the backfill). */
    at?: Date;
}

/** A dated intent from the classifier. */
export interface ICustomerProductIntentInput {
    stage:
        | ENUM_CUSTOMER_JOURNEY_STAGE.INTERESTED
        | ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE;
    /** Null when the customer asked about the shop in general. */
    productGroupId?: string | null;
    /** The customer's message time. */
    occurredAt: Date;
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

/** What a merge changed on the survivor's "Tạm hoãn" rows. */
export interface ICustomerMarketingMergeResult {
    /** Ids are set once the merge flushes. */
    createdReactions: CustomerProductReactionEntity[];
    replacedReactions: ICustomerProductReactionBefore[];
}

/** A survivor row before the merge moved its date. */
export interface ICustomerProductReactionBefore {
    id: string;
    /** ISO date, as kept in the unmerge snapshot. */
    until: string;
    reason: string | null;
}

/** Kept in the merge suggestion's unmerge snapshot. */
export interface ICustomerMarketingMergeUndo {
    createdReactionIds?: string[];
    replacedReactions?: ICustomerProductReactionBefore[];
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
