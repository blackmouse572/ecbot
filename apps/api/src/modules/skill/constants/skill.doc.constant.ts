export const SKILL_DEFAULT_AVAILABLE_SEARCH = ['name', 'slug', 'description'];

export const SkillDocParamsId = [
    {
        name: 'skillId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '2b760cb0-eaeb-40b0-b1cb-ff95ebeb9845',
    },
];

export const ChatbotSkillDocParamsChatbotId = [
    {
        name: 'chatbotId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '977e3947-67fa-400f-86d1-694d5c525e58',
    },
];

export const SkillDocQuerySource = [
    {
        name: 'source',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'workspace',
        description:
            "workspace (default): the workspace's skills; template: builtin templates to clone; all: both",
    },
];

// Filter query params for the admin agent-skill list. The
// `@PaginationQueryFilter*` decorators emit no OpenAPI metadata, so they are
// declared here or `pnpm generate:client` drops them from the generated client.
export const ChatbotSkillAdminDocQueryFilters = [
    {
        name: 'workspace',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: '91dbd24d-0a1c-448d-b360-93b3a6c9b4bf',
        description: 'Filter by workspace id',
    },
    {
        name: 'chatbot',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: '7c1f2a3e-5b9d-4e8f-a1c2-3d4e5f6a7b8c',
        description: 'Filter by chatbot id',
    },
    {
        name: 'skill',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: '2b760cb0-eaeb-40b0-b1cb-ff95ebeb9845',
        description: 'Filter by skill id',
    },
    {
        name: 'enabled',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'true',
        description: "true, false, or both with ',' delimiter",
    },
];
