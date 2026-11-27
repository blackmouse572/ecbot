import type { InvitationListResponseDto } from "@repo/client";
import type { ParseKeys } from "i18next";

/** Built-in role the API grants when an invitation carries no role. */
export const DEFAULT_MEMBER_ROLE_NAME = "Sales";

/**
 * Built-in workspace roles (WORKSPACE_DEFAULT_MEMBER_ROLES in the API), by
 * the English name the API stores. Admin and Member are the older names, kept
 * where a workspace could not be migrated.
 */
export const BUILT_IN_ROLE_LABELS: Record<
  string,
  { name: ParseKeys; description?: ParseKeys }
> = {
  Manager: {
    name: "roles.builtIn.manager.name",
    description: "roles.builtIn.manager.description",
  },
  Sales: {
    name: "roles.builtIn.sales.name",
    description: "roles.builtIn.sales.description",
  },
  Marketing: {
    name: "roles.builtIn.marketing.name",
    description: "roles.builtIn.marketing.description",
  },
  Developer: {
    name: "roles.builtIn.developer.name",
    description: "roles.builtIn.developer.description",
  },
  Member: { name: "roles.types.workspaceMember" },
  Admin: { name: "roles.types.admin" },
};

export const ROLE_OPTIONS_PER_PAGE = 100;

type InvitationStatus = InvitationListResponseDto["status"];

export const INVITATION_STATUS_COLOR: Record<
  InvitationStatus,
  "orange" | "green" | "grey" | "red"
> = {
  PENDING: "orange",
  ACCEPTED: "green",
  REVOKED: "grey",
  DECLINED: "grey",
  EXPIRED: "red",
};
