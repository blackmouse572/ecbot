import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';

// A product group's learned repurchase cycle is used only once there are at
// least this many pairs of consecutive confirmed orders to take a median of.
export const ORDER_LEARNED_CYCLE_MIN_PAIRS = 5;

export const ORDER_DEFAULT_CURRENCY = 'VND';

// Prefix of the generated order code: DH-YYMMDD-XXXX ("đơn hàng").
export const ORDER_CODE_PREFIX = 'DH';

// Characters of the random part of a generated code (no 0/O, 1/I), and how
// many codes to try before giving up on a collision.
export const ORDER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ORDER_CODE_ATTEMPTS = 5;

// Orders and product groups are customer data, so they share the CUSTOMER
// permission, one action per verb like the customer routes.
export const ORDER_ABILITY_READ = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.READ],
};
export const ORDER_ABILITY_CREATE = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.CREATE],
};
export const ORDER_ABILITY_UPDATE = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.UPDATE],
};
export const ORDER_ABILITY_DELETE = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.DELETE],
};

// Rows per import request; a bigger file is sent in several requests. Each
// order is a few sequential queries, so this keeps one request to seconds.
export const ORDER_IMPORT_MAX_ROWS = 200;

// Items the bot may note on one chat order.
export const ORDER_CHAT_MAX_ITEMS = 50;

// Why an import row was not imported, as the preview and result report it.
export const ORDER_IMPORT_INVALID_REASONS = [
    'missingPhone',
    'badDate',
    'badNumber',
    'empty',
    'customerLimit',
    'failed',
] as const;
