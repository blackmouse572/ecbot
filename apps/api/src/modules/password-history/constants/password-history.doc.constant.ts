import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';

// Custom filter query params for the global admin list. The `@PaginationQueryFilter*`
// decorators use a bare `Query(...)` + pipe and emit no OpenAPI metadata of their
// own, so they must be declared here or `pnpm generate:client` drops them from the
// generated client (search/page/perPage/orderBy come from DocResponsePaging).
export const PasswordHistoryDocQueryFilters = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_PASSWORD_HISTORY_TYPE).join(','),
        description:
            "The type of the password history, value with ',' delimiter",
    },
    {
        name: 'user',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'a35a5f92-685b-4e1f-a96d-c9d2a99dcd5d',
        description: 'Filter by the owning user id',
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
