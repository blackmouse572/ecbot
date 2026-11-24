/** One inbound customer message the bot never answered. */
export interface IUnansweredInboundRow {
    messageId: string;
    createdAt: Date;
    conversationId: string;
    chatbotId: string;
    workspaceId: string;
    /** Account type, i.e. the channel the customer wrote on. */
    platform: string;
}
