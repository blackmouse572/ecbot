import { ChatbotEntity } from '../repository/entities/chatbot.entity';

export type IChatbotEntity = ChatbotEntity;
export type IChatbotDoc = ChatbotEntity;

// An account `linkBatchAccounts` refused because it already belongs to a
// different chatbot (see AccountEntity#chatbot; syncAccount upserts by
// externalId, so a client can otherwise be handed an id it does not own).
export interface IChatbotLinkAccountsSkipped {
    id: string;
    name: string;
}

export interface IChatbotLinkAccountsResult {
    linked: string[];
    skipped: IChatbotLinkAccountsSkipped[];
}
