import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';

// The dashboard counts resolves and takeovers from these rows, so only a real
// change logs one; a repeated request logs a plain update.

/** The activity a member's status change logs (dashboard: resolved). */
export function statusActivityAction(
    before: ENUM_CONVERSATION_STATUS,
    after: ENUM_CONVERSATION_STATUS
): ENUM_ACTIVITY_ACTION {
    if (before === after) return ENUM_ACTIVITY_ACTION.UPDATE;
    return after === ENUM_CONVERSATION_STATUS.RESOLVED
        ? ENUM_ACTIVITY_ACTION.CONVERSATION_RESOLVED
        : ENUM_ACTIVITY_ACTION.CONVERSATION_REOPENED;
}

/** The activity a member switching the bot logs (dashboard: takeovers). */
export function botActivityAction(
    before: boolean,
    after: boolean
): ENUM_ACTIVITY_ACTION {
    if (before === after) return ENUM_ACTIVITY_ACTION.UPDATE;
    return after
        ? ENUM_ACTIVITY_ACTION.CONVERSATION_BOT_RESUMED
        : ENUM_ACTIVITY_ACTION.CONVERSATION_TAKEOVER;
}
