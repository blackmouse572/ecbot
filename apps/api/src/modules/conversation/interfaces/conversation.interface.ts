export interface IConversationCustomerSummary {
    customerId: string;
    conversationCount: number;
    /** Distinct account types (ENUM_ACCOUNT_TYPE values) the customer talked on. */
    channels: string[];
}
