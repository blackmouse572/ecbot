import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';

export const ConversationDocParamsId = [
    {
        name: 'id',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '5b0e2a63-6c1e-4d3c-9a4e-2f7b1c8d9e10',
    },
];

export const ConversationDocQueryStatus = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_CONVERSATION_STATUS).join(','),
        description: "The status of the conversation, value with ',' delimiter",
    },
];

export const ConversationDocQueryAccountType = [
    {
        name: 'accountType',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_ACCOUNT_TYPE).join(','),
        description:
            "The channel of the conversation, value with ',' delimiter",
    },
];

export const ConversationDocQueryAccount = [
    {
        name: 'account',
        required: false,
        type: 'string',
        description: 'Account ID the conversation came in on.',
    },
];

export const ConversationDocQueryChatbot = [
    {
        name: 'chatbot',
        required: false,
        type: 'string',
        description: 'Chatbot ID handling the conversation.',
    },
];

export const ConversationDocQueryBotEnabled = [
    {
        name: 'botEnabled',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true,false',
        description: "Whether the bot replies, boolean with ',' delimiter",
    },
];
