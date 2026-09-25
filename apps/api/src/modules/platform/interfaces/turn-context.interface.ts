import { TokenUsageDelta } from '@app/modules/chatbot/interfaces/token-usage-wire.interface';
import { AIChatHistoryMessage } from '@app/modules/chatbot/services/chatbot-ai.service';

/** What apps/ai gets for one Turn. */
export interface ITurnContext {
    history: AIChatHistoryMessage[];
    /** The burst's texts, then one note per burst image: what apps/ai saw in
     *  it, or that it could not be viewed. */
    message: string;
    /** Tokens spent describing the burst's images, billed with the Turn. */
    usage?: TokenUsageDelta;
}
