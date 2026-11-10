export enum ENUM_ORDER_STATUS {
    // "Chờ xác nhận": drafted by the bot in chat, waiting for an operator.
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
}

export enum ENUM_ORDER_SOURCE {
    CHAT = 'CHAT',
    MANUAL = 'MANUAL',
    IMPORT = 'IMPORT',
}
