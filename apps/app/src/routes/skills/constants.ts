export const SKILL_CONSTANTS = {
  PAGE_SIZE: 20,
} as const;

export const SKILL_STATUS_COLOR: Record<string, "green" | "grey"> = {
  ACTIVE: "green",
  INACTIVE: "grey",
};

export const SKILL_QUERY_PARAMS = ["page", "perPage", "search", "source"];
