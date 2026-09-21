export const TOOL_STATUS_COLOR: Record<
  string,
  "green" | "orange" | "red" | "grey"
> = {
  ACTIVE: "green",
  NEEDS_REAUTH: "orange",
  EXPIRED: "orange",
  REVOKED: "red",
};

export const TOOL_CONSTANTS = {
  PAGE_SIZE: 20,
} as const;

export const TOOL_QUERY_PARAMS = [
  "page",
  "perPage",
  "search",
  "order",
  "kind",
  "status",
  "mcpProvider",
  "sourceToolkit",
] as const;
