import { ENUM_CHATBOT_STATUS } from '@app/modules/chatbot/enums/chatbot.enum';
import { ENUM_WORKSPACE_STATUS } from '@app/modules/workspace/enums/workspace.enum';
import { TURNED_OFF_CHATBOT_STATUSES } from '../constants/turned-off-chatbot.constant';

/**
 * The agent keeps its inbox but must not answer: it is turned off, or an
 * admin suspended its workspace.
 */
export function isAgentSilenced(
    chatbot: { status: ENUM_CHATBOT_STATUS },
    workspace?: { status?: ENUM_WORKSPACE_STATUS }
): boolean {
    return (
        TURNED_OFF_CHATBOT_STATUSES.includes(chatbot.status) ||
        workspace?.status === ENUM_WORKSPACE_STATUS.SUSPENDED
    );
}
