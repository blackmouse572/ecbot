import type { InvitationListResponseDto } from "@repo/client";

/** Built-in role the API grants when an invitation carries no role. */
export const DEFAULT_MEMBER_ROLE_NAME = "Member";

export const ROLE_OPTIONS_PER_PAGE = 100;

type InvitationStatus = InvitationListResponseDto["status"];

export const INVITATION_STATUS_COLOR: Record<
  InvitationStatus,
  "orange" | "green" | "grey" | "red"
> = {
  PENDING: "orange",
  ACCEPTED: "green",
  REVOKED: "grey",
  EXPIRED: "red",
};
