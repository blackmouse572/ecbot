export enum ENUM_KNOWLEDGE_BASE_ITEM_TYPE {
    FILE = 'FILE',
    URL = 'URL',
    TEXT = 'TEXT',
    /** An image or PDF the agent can send; indexed apart from the chunks. */
    MEDIA = 'MEDIA',
}
export const ENUM_KNOWLEDGE_BASE_ITEM_TYPES = Object.values(
    ENUM_KNOWLEDGE_BASE_ITEM_TYPE
);
