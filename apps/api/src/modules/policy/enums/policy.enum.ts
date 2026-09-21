export enum ENUM_POLICY_ACTION {
    MANAGE = 'manage',
    READ = 'read',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
}

export enum ENUM_POLICY_SUBJECT {
    ACCOUNT = 'ACCOUNT',
    AUTH = 'AUTH',
    API_KEY = 'API_KEY',
    COUNTRY = 'COUNTRY',
    ROLE = 'ROLE',
    USER = 'USER',
    SESSION = 'SESSION',
    ACTIVITY = 'ACTIVITY',
    DASHBOARD = 'DASHBOARD',
    UTILITIES = 'UTILITIES',
    WORKSPACE = 'WORKSPACE',
    CHATBOT = 'CHATBOT',
    /** @deprecated Order module removed; retained so historical activity rows stay typed. */
    ORDER = 'ORDER',
    MEMBER = 'MEMBER',
    RAG = 'RAG',
    KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
    TOOL = 'TOOL',
    CUSTOMER = 'CUSTOMER',
    CONTACT_POINT = 'CONTACT_POINT',
    CONVERSATION = 'CONVERSATION',
    INVITATION = 'INVITATION',
    CLIENT_CREDENTIAL = 'CLIENT_CREDENTIAL',
    SKILL = 'SKILL',
    WAITLIST = 'WAITLIST',
    TOKEN_USAGE = 'TOKEN_USAGE',
    PLAN = 'PLAN',
}

export enum ENUM_POLICY_ROLE_TYPE {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER',
    WORKSPACE_OWNER = 'WORKSPACE_OWNER',
    WORKSPACE_MEMBER = 'WORKSPACE_MEMBER',
}
