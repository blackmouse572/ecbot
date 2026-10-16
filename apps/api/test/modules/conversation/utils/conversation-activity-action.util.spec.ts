import { ENUM_ACTIVITY_ACTION } from '../../../../src/modules/activity/enums/activity.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../../src/modules/conversation/enums/conversation.enum';
import {
    botActivityAction,
    statusActivityAction,
} from '../../../../src/modules/conversation/utils/conversation-activity-action.util';

// The dashboard counts resolves and takeovers from the activity log, so a
// member's status or bot change logs what happened, not a bare "update".
describe('conversation activity actions', () => {
    it('logs a resolve and a reopen', () => {
        expect(statusActivityAction(ENUM_CONVERSATION_STATUS.RESOLVED)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_RESOLVED
        );
        expect(statusActivityAction(ENUM_CONVERSATION_STATUS.OPEN)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_REOPENED
        );
    });

    it('logs staff taking over and handing back to the bot', () => {
        expect(botActivityAction(false)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_TAKEOVER
        );
        expect(botActivityAction(true)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_BOT_RESUMED
        );
    });
});
