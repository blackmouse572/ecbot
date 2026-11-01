import { TokenUsageDelta } from './token-usage-wire.interface';

/** An uploaded file a preview message refers to. */
export interface IChatbotPreviewAttachment {
    key: string;
    name?: string;
}

/** What the agent reads for a preview message's attachments, and what
 *  describing its images cost. */
export interface IChatbotPreviewNotes {
    notes: string[];
    usage?: TokenUsageDelta;
    model?: string;
}
