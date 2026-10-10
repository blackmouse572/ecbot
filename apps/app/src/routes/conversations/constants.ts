import type { ENUM_POLICY_SUBJECT } from "@repo/auth";

// Handoff reasons the API stores as codes; anything else (a guardrail or
// operator reason) is free text and is shown as written.
export const HANDOFF_REASON_CODES = [
  "keyword_trigger",
  "tag_trigger",
  "fallback_threshold",
] as const;

// Below this width the conversations area stacks like a mobile app: list,
// then thread, then customer details, one screen at a time.
export const SMALL_SCREEN_QUERY = "(max-width: 768px)";

// Search param holding the stacked customer details screen on small screens.
export const PANEL_PARAM = "panel";
export const CUSTOMER_PANEL = "customer";

// Customer data rights (export and permanent erasure) are their own subject,
// held by the workspace owner and admins only, not by Members.
export const CUSTOMER_DATA_SUBJECT: ENUM_POLICY_SUBJECT = "CUSTOMER_DATA";
