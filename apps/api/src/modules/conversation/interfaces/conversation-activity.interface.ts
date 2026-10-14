import { ENUM_CONVERSATION_ACTIVITY_KIND } from '../enums/conversation-activity.enum';

/** One knowledge source behind a reply, as apps/ai streamed it. */
export interface IConversationActivitySource {
    id: string;
    title?: string;
    /** Only web pages have one; uploaded files and text items do not. */
    sourceUrl?: string;
}

/** Built-in tool kinds as apps/ai's `data-tool-meta` reports them. */
export type ConversationActivityBuiltInToolKind =
    'customer' | 'tag' | 'followup';

/**
 * A built-in tool call (customer fields, tags, follow-ups), which no
 * tool invocation row records. `kind` is the stream's `data-tool-meta` kind,
 * or `handoff` for a tag that handed the chat to staff.
 */
export interface IConversationActivityTool {
    kind: ConversationActivityBuiltInToolKind | 'handoff';
    args: Record<string, unknown>;
    result?: unknown;
    error?: string;
}

export interface IConversationActivityPayload {
    count?: number;
    sources?: IConversationActivitySource[];
    tool?: IConversationActivityTool;
}

/** An activity read off a reply stream, before it is stored. */
export interface IReplyActivity extends IConversationActivityPayload {
    kind: ENUM_CONVERSATION_ACTIVITY_KIND;
    /** The skill slug, for a skill load; the tool name, for a tool call. */
    label?: string;
    /** When the stream announced it, so it splices under the right reply. */
    at: Date;
}
