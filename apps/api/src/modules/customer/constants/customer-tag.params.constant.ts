// Centralised path-parameter names for the customer-tag controllers so that
// the Swagger docs (DocRequest params) and the runtime @Param() decorators
// stay in lockstep.
export const CUSTOMER_TAG_PARAM = 'customerTag';

export const CustomerTagDocParams = [
    {
        name: CUSTOMER_TAG_PARAM,
        description: 'The ID of the customer tag',
        required: true,
        type: 'string',
    },
];

export const CustomerTagAssignmentDocParams = [
    {
        name: 'customerId',
        description: 'The ID of the customer',
        required: true,
        type: 'string',
    },
    {
        name: 'tagId',
        description: 'The ID of the customer tag',
        required: true,
        type: 'string',
    },
];
