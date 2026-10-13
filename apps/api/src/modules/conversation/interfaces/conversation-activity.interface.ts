import { ENUM_CONVERSATION_ACTIVITY_KIND } from '../enums/conversation-activity.enum';

/** One knowledge source behind a reply, as apps/ai streamed it. */
export interface IConversationActivitySource {
    id: string;
    title?: string;
    /** Only web pages have one; uploaded files and text items do not. */
    sourceUrl?: string;
}

export interface IConversationActivityPayload {
    count?: number;
    sources?: IConversationActivitySource[];
}

/** An activity read off a reply stream, before it is stored. */
export interface IReplyActivity extends IConversationActivityPayload {
    kind: ENUM_CONVERSATION_ACTIVITY_KIND;
    /** The skill slug, for a skill load. */
    label?: string;
    /** When the stream announced it, so it splices under the right reply. */
    at: Date;
}
