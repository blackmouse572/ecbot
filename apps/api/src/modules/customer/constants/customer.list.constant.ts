// Columns the customer list's free-text search looks in.
export const CUSTOMER_DEFAULT_AVAILABLE_SEARCH = ['name', 'phone', 'email'];

// Columns the customer list can be ordered by.
export const CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY = ['createdAt', 'name'];

// The admin customer list also finds a customer by their workspace's name.
export const CUSTOMER_ADMIN_AVAILABLE_SEARCH = [
    'name',
    'phone',
    'email',
    'workspace.name',
];

// The admin customer tag list is searched by tag name or workspace name.
export const CUSTOMER_TAG_ADMIN_AVAILABLE_SEARCH = ['name', 'workspace.name'];
