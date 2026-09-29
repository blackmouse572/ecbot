// Handoff reasons with their own owner-facing wording
// (notification.handoff.reason.<reason>). Any other reason, such as a
// guardrail name, reads as notification.handoff.reason.other.
export const NOTIFICATION_HANDOFF_REASONS = [
    'keyword_trigger',
    'fallback_threshold',
    'tag_trigger',
] as const;
