import type { ParseKeys } from "i18next";

// Default workspace roles the API creates (WORKSPACE_DEFAULT_MEMBER_ROLES).
export const DEFAULT_ROLE_LABELS: Record<string, ParseKeys> = {
  Member: "roles.types.workspaceMember",
  Admin: "roles.types.admin",
};
