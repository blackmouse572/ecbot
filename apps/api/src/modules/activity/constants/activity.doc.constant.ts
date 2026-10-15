import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';

// Filter query params for the global admin list. The `@PaginationQueryFilter*`
// decorators emit no OpenAPI metadata, so they are declared here or
// `pnpm generate:client` drops them from the generated client.
export const ActivityAdminDocQueryFilters = [
    {
        name: 'action',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_ACTIVITY_ACTION).join(','),
        description: "value with ',' delimiter",
    },
    {
        name: 'subject',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_POLICY_SUBJECT).join(','),
        description: "value with ',' delimiter",
    },
    {
        name: 'by',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'a35a5f92-685b-4e1f-a96d-c9d2a99dcd5d',
        description: 'Filter by the id of the user who acted',
    },
    {
        name: 'user',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'a35a5f92-685b-4e1f-a96d-c9d2a99dcd5d',
        description:
            'Filter by the id of the account the activity is logged on',
    },
    {
        name: 'workspace',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'a35a5f92-685b-4e1f-a96d-c9d2a99dcd5d',
        description: 'Filter by workspace id',
    },
    {
        name: 'createdAt',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: JSON.stringify({ $gte: '2026-01-01', $lte: '2026-02-01' }),
        description:
            'Filter createdAt, JSON string with $gte/$lte ISO date operators',
    },
];
