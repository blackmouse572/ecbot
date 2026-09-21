import { useSearchParams } from "react-router-dom";

export type QueryParams<T extends string> = {
  [key in T]: string | undefined;
};

export type SortOrder = "asc" | "desc";

export interface SortParams {
  orderBy?: string;
  orderDirection?: SortOrder;
}

/**
 * Parse order parameter with format "+/-field_name" to sortBy and sortOrder
 * Examples:
 * - "+createdAt" -> { orderBy: "createdAt", orderDirection: "asc" }
 * - "-updatedAt" -> { orderBy: "updatedAt", orderDirection: "desc" }
 * - "createdAt" -> { orderBy: "createdAt", orderDirection: "asc" }
 */
export function parseOrderParam(order: string | undefined): SortParams {
  if (!order) {
    return {};
  }

  const trimmedOrder = order.trim();

  if (trimmedOrder.startsWith("+")) {
    return {
      orderBy: trimmedOrder.slice(1),
      orderDirection: "asc",
    };
  }

  if (trimmedOrder.startsWith("-")) {
    return {
      orderBy: trimmedOrder.slice(1),
      orderDirection: "desc",
    };
  }

  // Default to ascending if no prefix
  return {
    orderBy: trimmedOrder,
    orderDirection: "asc",
  };
}

export function useQueryParams<T extends string>(
  keys: T[],
  prefix?: string,
): QueryParams<T> {
  const [params] = useSearchParams();

  // Use a type assertion to initialize the result
  const result = {} as QueryParams<T>;

  keys.forEach((key) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    const value = params.get(prefixedKey) || undefined;

    result[key] = value;
  });

  return result;
}

export function useQueryParamsWithSort<T extends string>(
  keys: T[],
  prefix?: string,
): QueryParams<T> & SortParams {
  const [params] = useSearchParams();

  // Use a type assertion to initialize the result
  const result = {} as QueryParams<T> & SortParams;

  keys.forEach((key) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    const value = params.get(prefixedKey) || undefined;

    // @ts-expect-error - This is safe because we are only assigning values for keys in T
    result[key] = value;
  });

  // Parse order parameter
  const orderParam = params.get(prefix ? `${prefix}_order` : "order");
  const sortParams = parseOrderParam(orderParam || undefined);

  result.orderBy = sortParams.orderBy;
  result.orderDirection = sortParams.orderDirection;

  return result;
}

// For loader
export function getQueryParams<T extends string>(
  params: URLSearchParams,
  keys: T[],
  prefix?: string,
): QueryParams<T> {
  // Use a type assertion to initialize the result
  const result = {} as QueryParams<T>;

  keys.forEach((key) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    const value = params.get(prefixedKey) || undefined;

    result[key] = value;
  });

  return result;
}

export function getQueryParamsWithSort<T extends string>(
  params: URLSearchParams,
  keys: T[],
  prefix?: string,
): QueryParams<T> & SortParams {
  // Use a type assertion to initialize the result
  const result = {} as QueryParams<T> & SortParams;

  keys.forEach((key) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    const value = params.get(prefixedKey) || undefined;

    // @ts-expect-error - This is safe because we are only assigning values for keys in T
    result[key] = value;
  });

  // Parse order parameter
  const orderParam = params.get(prefix ? `${prefix}_order` : "order");
  const sortParams = parseOrderParam(orderParam || undefined);

  result.orderBy = sortParams.orderBy;
  result.orderDirection = sortParams.orderDirection;
  // @ts-expect-error - This is safe because we are only assigning values for keys in T
  delete result.order; // Remove the original order parameter if it exists

  return result;
}
