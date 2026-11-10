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

export interface IOrderCreateOptions {
    // An import refreshes the learned cycles once at the end instead.
    refreshCycles?: boolean;
}

/** An order the bot noted in chat, as the AI service sends it. */
export interface IOrderChatDraft {
    items: IOrderItemInput[];
    total?: number;
    note?: string;
    conversationId?: string;
}

/** One CSV row after the operator mapped the columns. */
export interface IOrderImportRow {
    code?: string;
    phone?: string;
    name?: string;
    item?: string;
    group?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    orderedAt?: string;
    status?: ENUM_ORDER_STATUS.PENDING | ENUM_ORDER_STATUS.CONFIRMED;
}

export type OrderImportInvalidReason =
    'missingPhone' | 'badDate' | 'empty' | 'failed';

export interface IOrderImportResult {
    dryRun: boolean;
    orders: number;
    skipped: number;
    newCustomers: number;
    newGroups: string[];
    invalidRows: { row: number; reason: OrderImportInvalidReason }[];
}
