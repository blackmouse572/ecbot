import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../enums/order.enum';

export const ORDER_DEFAULT_AVAILABLE_SEARCH = ['code'];
export const ORDER_DEFAULT_AVAILABLE_ORDER_BY = [
    'orderedAt',
    'total',
    'createdAt',
];
export const ORDER_DEFAULT_STATUS = Object.values(ENUM_ORDER_STATUS);
export const ORDER_DEFAULT_SOURCE = Object.values(ENUM_ORDER_SOURCE);

export const PRODUCT_GROUP_DEFAULT_AVAILABLE_SEARCH = ['name'];
export const PRODUCT_GROUP_DEFAULT_AVAILABLE_ORDER_BY = ['name', 'createdAt'];
