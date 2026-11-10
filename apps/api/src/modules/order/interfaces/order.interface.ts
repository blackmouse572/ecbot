import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../enums/order.enum';

export interface IOrderItemInput {
    name: string;
    productGroupId?: string | null;
    quantity: number;
    unitPrice?: number | null;
}

export interface IOrderCreate {
    customerId: string;
    code?: string;
    items: IOrderItemInput[];
    total?: number;
    currency?: string;
    status: ENUM_ORDER_STATUS.PENDING | ENUM_ORDER_STATUS.CONFIRMED;
    source: ENUM_ORDER_SOURCE;
    orderedAt?: Date;
    note?: string;
    conversationId?: string;
}

export interface IOrderUpdate {
    code?: string;
    items?: IOrderItemInput[];
    total?: number;
    orderedAt?: Date;
    note?: string | null;
}

export interface IProductGroupInput {
    name?: string;
    defaultRepurchaseDays?: number | null;
}
