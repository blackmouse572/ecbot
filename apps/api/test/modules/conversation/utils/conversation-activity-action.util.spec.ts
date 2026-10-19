import { ENUM_ACTIVITY_ACTION } from '../../../../src/modules/activity/enums/activity.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../../src/modules/conversation/enums/conversation.enum';
import {
    botActivityAction,
    statusActivityAction,
} from '../../../../src/modules/conversation/utils/conversation-activity-action.util';

// The dashboard counts resolves and takeovers from the activity log, so a
// member's status or bot change logs what happened, not a bare "update".
describe('conversation activity actions', () => {
    const { OPEN, RESOLVED } = ENUM_CONVERSATION_STATUS;

    it('logs a resolve and a reopen', () => {
        expect(statusActivityAction(OPEN, RESOLVED)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_RESOLVED
        );
        expect(statusActivityAction(RESOLVED, OPEN)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_REOPENED
        );
    });

    it('logs staff taking over and handing back to the bot', () => {
        expect(botActivityAction(true, false)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_TAKEOVER
        );
        expect(botActivityAction(false, true)).toBe(
            ENUM_ACTIVITY_ACTION.CONVERSATION_BOT_RESUMED
        );
    });

    // A repeated request (e.g. an MCP client asking twice) changes nothing,
    // so it must not count as another resolve or takeover.
    it('logs a plain update when nothing changed', () => {
        expect(statusActivityAction(RESOLVED, RESOLVED)).toBe(
            ENUM_ACTIVITY_ACTION.UPDATE
        );
        expect(botActivityAction(false, false)).toBe(
            ENUM_ACTIVITY_ACTION.UPDATE
        );
        expect(botActivityAction(true, true)).toBe(ENUM_ACTIVITY_ACTION.UPDATE);
    });
});
