import { ENUM_FOLLOWUP_STATUS } from './followup.constant';

export const FollowupAdminDocParamsId = [
    {
        name: 'followup',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'bab80caa-50d0-496a-9d19-c8a3c3c93520',
    },
];

// Filter query params for the admin list. The `@PaginationQueryFilter*`
// decorators emit no OpenAPI metadata, so they are declared here or
// `pnpm generate:client` drops them from the generated client.
export const FollowupAdminDocQueryFilters = [
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
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_FOLLOWUP_STATUS).join(','),
        description: "value with ',' delimiter",
    },
];
