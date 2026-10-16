// The admin knowledge list is searched by item title or workspace name. The
// search pipe builds its $or only from these paths.
export const KNOWLEDGE_ITEM_ADMIN_AVAILABLE_SEARCH = [
    'title',
    'knowledgeBase.workspace.name',
];
