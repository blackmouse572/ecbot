// Handover emails can be triggered by anyone on a public widget, so they are
// capped. Past a cap, staff still get the in-app notification.

/** One handover email round per conversation in this window. */
export const HANDOFF_EMAIL_CONVERSATION_WINDOW_SECONDS = 30 * 60;

/** At most this many handover email rounds per workspace per window. */
export const HANDOFF_EMAIL_WORKSPACE_LIMIT = 10;
export const HANDOFF_EMAIL_WORKSPACE_WINDOW_SECONDS = 60 * 60;

export const HANDOFF_EMAIL_KEY_PREFIX = 'handoff-email';
