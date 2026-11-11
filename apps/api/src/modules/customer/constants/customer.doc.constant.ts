import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../enums/customer-marketing.enum';

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

// Marketing label filters for the workspace and client customer lists. The
// filter decorators emit no OpenAPI metadata, so they are declared here.
export const CustomerDocQueryMarketingFilters = [
    {
        name: 'stage',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: [
            ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE,
            ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE,
        ].join(','),
        description:
            "Journey stages, with ',' delimiter. A customer with no labels yet counts as NEW.",
    },
    {
        name: 'permission',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: ENUM_CUSTOMER_MARKETING_PERMISSION.GRANTED,
        description:
            "Offers permissions, with ',' delimiter. A customer with no labels yet counts as PENDING.",
    },
    {
        name: 'dormant',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
        description:
            'Lâu không nhắn: true for only customers with no message and no order for 120 days, false to leave them out.',
    },
    {
        name: 'source',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: '0193a5d2-7c1e-7b3a-9f1e-2b8c4d6e8f10',
        description:
            'A source id: customers whose first source is that source or one of its codes.',
    },
];
