import { queryKeysFactory } from "@/libs/query-factory";

// Orders and product groups invalidate each other, so their keys live apart
// from both hooks files and neither imports the other.
export const ORDER_QUERY_KEY = "orders" as const;
export const orderQueryKeys = queryKeysFactory(ORDER_QUERY_KEY);

export const PRODUCT_GROUP_QUERY_KEY = "product-groups" as const;
export const productGroupQueryKeys = queryKeysFactory(PRODUCT_GROUP_QUERY_KEY);
