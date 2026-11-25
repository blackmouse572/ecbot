import { REPLY_MISSED_EVENT } from '../constants/reply-missed.constant';

/** Where a miss was detected: a turn that reported `failed`, or its delayed check. */
export type ReplyMissedSource = 'turn' | 'poc-reply' | 'check';

/** The `reply.missed` log payload. The delayed check fills every field; a
 *  turn knows only its conversation and the reason. */
export interface IReplyMissedEvent {
    event: typeof REPLY_MISSED_EVENT;
    source: ReplyMissedSource;
    conversationId: string;
    chatbotId?: string;
    workspaceId?: string;
    platform?: string;
    ageSec?: number;
    reason?: string;
}
