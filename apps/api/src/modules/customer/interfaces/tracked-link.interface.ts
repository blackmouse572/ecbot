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
