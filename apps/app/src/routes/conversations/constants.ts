// Handoff reasons the API stores as codes; anything else (a guardrail or
// operator reason) is free text and is shown as written.
export const HANDOFF_REASON_CODES = [
  "keyword_trigger",
  "tag_trigger",
  "fallback_threshold",
] as const;
