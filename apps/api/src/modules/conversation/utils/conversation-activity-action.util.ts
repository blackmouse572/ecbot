import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';

/** The activity a member's status change logs (dashboard: resolved). */
export function statusActivityAction(
    status: ENUM_CONVERSATION_STATUS
): ENUM_ACTIVITY_ACTION {
    return status === ENUM_CONVERSATION_STATUS.RESOLVED
        ? ENUM_ACTIVITY_ACTION.CONVERSATION_RESOLVED
        : ENUM_ACTIVITY_ACTION.CONVERSATION_REOPENED;
}

/** The activity a member switching the bot logs (dashboard: takeovers). */
export function botActivityAction(botEnabled: boolean): ENUM_ACTIVITY_ACTION {
    return botEnabled
        ? ENUM_ACTIVITY_ACTION.CONVERSATION_BOT_RESUMED
        : ENUM_ACTIVITY_ACTION.CONVERSATION_TAKEOVER;
}
