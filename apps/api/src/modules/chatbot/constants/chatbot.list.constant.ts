import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';

export const CHATBOT_SEARCHABLE_FIELDS = ['name'];

// `accounts` is the entity relation; the list endpoint exposes it to
// clients under the singular `account` query param.
export const CHATBOT_ACCOUNT_FILTER_OPTIONS = { queryField: 'account' };

export const CHATBOT_DEFAULT_SORT = 'name';
export const CHATBOT_DEFAULT_ORDER_DIRECTION =
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
export const CHATBOT_DEFAULT_PER_PAGE = 20;
export const CHATBOT_DEFAULT_AVAILABLE_SORT = [
    'name',
    'createdAt',
    'updatedAt',
];

export const CHATBOT_DEFAULT_ORDER_BY = {
    [CHATBOT_DEFAULT_SORT]: CHATBOT_DEFAULT_ORDER_DIRECTION,
};
