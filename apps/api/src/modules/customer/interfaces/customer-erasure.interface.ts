/** What a hard delete of one customer removed from the database. */
export interface ICustomerErasure {
    customerIds: string[];
    contactPointIds: string[];
    conversationIds: string[];
    messageCount: number;
    /** S3 keys of the stored message media, still to be removed. */
    mediaKeys: string[];
}

/** Counts returned to the caller and written to the audit log (no PII). */
export interface ICustomerErasureSummary {
    customers: number;
    contactPoints: number;
    conversations: number;
    messages: number;
    mediaFiles: number;
}
