import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';

export interface IConversationCustomerSummary {
    customerId: string;
    conversationCount: number;
    /** Distinct account types (ENUM_ACCOUNT_TYPE values) the customer talked on. */
    channels: string[];
}

/** The conversations list filters on the conversation's customer. */
export interface IConversationCustomerFilter {
    stages?: ENUM_CUSTOMER_JOURNEY_STAGE[];
    tagIds?: string[];
}
