import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';

export const CustomerDocParamsId = [
    {
        name: 'id',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '0d6f7a52-8b1c-4f3e-9c2a-6e5d4b3a2f10',
    },
];

export const CustomerAdminDocParamsId = [
    {
        name: 'customer',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '0d6f7a52-8b1c-4f3e-9c2a-6e5d4b3a2f10',
    },
];

const CustomerAdminDocQueryWorkspace = {
    name: 'workspace',
    allowEmptyValue: true,
    required: false,
    type: 'string',
    example: '91dbd24d-0a1c-448d-b360-93b3a6c9b4bf',
    description: 'Filter by workspace id',
};

// Filter query params for the admin lists. The `@PaginationQueryFilter*`
// decorators emit no OpenAPI metadata, so they are declared here or
// `pnpm generate:client` drops them from the generated client.
export const CustomerAdminDocQueryFilters = [
    CustomerAdminDocQueryWorkspace,
    {
        name: 'tag',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: 'e572d33e-dbc3-45f2-857b-1ce34654d81c',
        description: 'Filter by the id of a tag assigned to the customer',
    },
    {
        name: 'channel',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: [
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            ENUM_ACCOUNT_TYPE.ZALO_PAGE,
        ].join(','),
        description:
            "Channel types the customer has a contact point on, with ',' delimiter",
    },
];

export const CustomerTagAdminDocQueryFilters = [CustomerAdminDocQueryWorkspace];
