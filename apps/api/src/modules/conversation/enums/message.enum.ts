export enum ENUM_MESSAGE_DIRECTION {
    INBOUND = 'INBOUND',
    OUTBOUND = 'OUTBOUND',
}

export enum ENUM_MESSAGE_AUTHOR {
    USER = 'USER',
    BOT = 'BOT',
    OPERATOR = 'OPERATOR',
    // A note the platform writes into the conversation (never sent to the
    // customer), such as the one left when staff hand it back to the bot.
    SYSTEM = 'SYSTEM',
}

export enum ENUM_MESSAGE_STATUS {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
}
