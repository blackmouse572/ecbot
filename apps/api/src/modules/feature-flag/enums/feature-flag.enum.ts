/** Feature flag keys. The values are the flag keys a provider (PostHog) uses. */
export enum ENUM_FEATURE_FLAG {
    /** Đơn hàng: orders, product groups, order import, the record_order tool. */
    ORDERS = 'orders',
    /** Nguồn khách: tracked links, their stats and first-source attribution. */
    CUSTOMER_SOURCES = 'customer-sources',
}
