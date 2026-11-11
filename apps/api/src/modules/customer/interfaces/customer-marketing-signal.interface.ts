/**
 * One marketing signal from the classifier (#500), as apps/ai returns it:
 * already checked against the conversation and the shop's product groups.
 */
export interface ICustomerMarketingSignal {
    kind: 'interest' | 'asked_price' | 'later' | 'hostile';
    product_group?: string;
    product_group_id?: string | null;
    /** "later" only: 60 or 90. */
    defer_days?: number | null;
    /** Position in the messages sent to the classifier. */
    message_index: number;
    /** The customer's words, the "why" on the event. */
    quote?: string;
}

/** The Customer and conversation the signals were read from. */
export interface ICustomerMarketingSignalTarget {
    customerId: string;
    workspaceId: string;
    conversationId: string;
    /** The messages sent to the classifier, in the same order. */
    messages: { id: string; dateSent: Date }[];
}

/** A product group as the classifier sees it. */
export interface ICustomerMarketingSignalProductGroup {
    id: string;
    name: string;
}
