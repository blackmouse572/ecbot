import { ENUM_CHATBOT_STATUS } from '@app/modules/chatbot/enums/chatbot.enum';

/** Agent states that keep their channel's inbox but never answer customers. */
export const TURNED_OFF_CHATBOT_STATUSES: readonly ENUM_CHATBOT_STATUS[] = [
    ENUM_CHATBOT_STATUS.INACTIVE,
    ENUM_CHATBOT_STATUS.ARCHIVED,
];
