import { ENUM_CUSTOMER_TAG_EVENT_ACTOR } from '../enums/customer-tag.enum';

/** Who changed a customer's tags, and where, for the tag history. */
export interface ICustomerTagEventContext {
    actor: ENUM_CUSTOMER_TAG_EVENT_ACTOR;
    conversationId?: string;
    /** The member, for OPERATOR and CLIENT changes. */
    userId?: string;
}
