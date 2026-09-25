import { AIChatHistoryMessage } from '@app/modules/chatbot/services/chatbot-ai.service';

/** What apps/ai gets for one Turn: its history, message and images. */
export interface ITurnContext {
    history: AIChatHistoryMessage[];
    /** The burst's texts, then a note per image apps/ai cannot view. */
    message: string;
    /** The burst's images, as urls apps/ai can fetch. */
    attachments: { attachment_id: string; preview_url: string }[];
}
