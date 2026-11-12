import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../enums/order.enum';

export const ORDER_PARAM = 'order';
export const PRODUCT_GROUP_PARAM = 'productGroup';

export const OrderDocParamsId = [
    {
        name: ORDER_PARAM,
        description: 'The ID of the order',
        required: true,
        type: 'string',
    },
];

export const ProductGroupDocParamsId = [
    {
        name: PRODUCT_GROUP_PARAM,
        description: 'The ID of the product group',
        required: true,
        type: 'string',
    },
];

// The `@PaginationQueryFilter*` decorators emit no OpenAPI metadata, so the
// filters are declared here or `pnpm generate:client` drops them.
export const OrderDocQueryFilters = [
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_ORDER_STATUS).join(','),
        description: "Order status, value with ',' delimiter",
    },
    {
        name: 'source',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(ENUM_ORDER_SOURCE).join(','),
        description: "Where the order came from, value with ',' delimiter",
    },
    {
        name: 'customer',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        description: 'Only the orders of this customer',
    },
    {
        name: 'productGroup',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        description: 'Only orders with an item in this product group',
    },
];

export const ProductGroupDocQueryStats = [
    {
        name: 'withStats',
        allowEmptyValue: true,
        required: false,
        type: 'boolean',
        example: true,
        description:
            'Add confirmedOrders, customers and repurchasePairs to each group',
    },
];
