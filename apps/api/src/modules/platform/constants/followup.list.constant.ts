// The admin follow-up list is searched by reason, sender, chatbot or
// workspace name. The search pipe builds its $or only from these paths.
export const FOLLOWUP_ADMIN_AVAILABLE_SEARCH = [
    'reason',
    'conversation.senderName',
    'chatbot.name',
    'chatbot.workspace.name',
];
