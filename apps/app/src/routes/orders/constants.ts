import type { OrderGetResponseDto } from "@/hooks/api/orders";

export const ORDER_CONSTANTS = {
  PAGE_SIZE: 20,
  /** The API's list maximum: enough for every group in a shop. */
  GROUP_PAGE_SIZE: 100,
  CUSTOMER_SEARCH_DEBOUNCE_MS: 250,
} as const;

export const ORDER_QUERY_PARAMS = [
  "page",
  "search",
  "status",
  "source",
  "productGroup",
];

export const PRODUCT_GROUP_QUERY_PARAMS = ["page", "search"];

export const ORDER_STATUS_COLOR = {
  PENDING: "orange",
  CONFIRMED: "green",
  CANCELLED: "grey",
} as const satisfies Record<OrderGetResponseDto["status"], string>;

// SAFETY: the keys are the statuses, checked by `satisfies` above.
export const ORDER_STATUSES = Object.keys(
  ORDER_STATUS_COLOR,
) as OrderGetResponseDto["status"][];

/** The statuses an order can be saved with; Huỷ đơn is its own action. */
export const ORDER_FORM_STATUSES = ["CONFIRMED", "PENDING"] as const;

export const ORDER_SOURCES: OrderGetResponseDto["source"][] = [
  "CHAT",
  "MANUAL",
  "IMPORT",
];

/** The API stores an order in đồng unless it says otherwise. */
export const ORDER_DEFAULT_CURRENCY = "VND";
