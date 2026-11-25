import { ENUM_TRACKED_LINK_KIND } from '../enums/tracked-link.enum';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';

/** The parts of a channel account a tracked link's URL is built from. */
export interface ITrackedLinkAccount {
    type: ENUM_ACCOUNT_TYPE;
    externalId: string;
    link?: string;
}

/** What a new tracked link is made from; relations are given by id. */
export interface ITrackedLinkCreate {
    workspaceId: string;
    accountId: string;
    parentId?: string;
    kind: ENUM_TRACKED_LINK_KIND;
    name: string;
    code: string;
    greeting?: string | null;
    tagIds?: string[];
    promisesOffer?: boolean;
    targetUrl?: string | null;
}

/** A tracked link code read on a customer's inbound message. */
export interface ITrackedLinkArrival {
    customerId: string;
    workspaceId: string;
    code: string;
    conversationId?: string;
    messageId?: string;
}

/** Nguồn khách counts for one tracked link. */
export interface ITrackedLinkStats {
    /** Customers whose first source was this link. */
    newCustomers: number;
    /** Earlier customers who later arrived through this link. */
    returningCustomers: number;
    /** New or returning, and asked the price or bought (Hỏi giá and later). */
    potentialCustomers: number;
    /** Confirmed orders whose last link before the order was this one. */
    orders: number;
}
