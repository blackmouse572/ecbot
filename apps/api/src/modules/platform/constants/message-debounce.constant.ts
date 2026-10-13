export const MESSAGE_DEBOUNCE_MS = 3000;

/**
 * Platform typing indicators (e.g. Messenger `typing_on`) auto-expire after
 * ~20s. A reply that runs tool roundtrips can take longer, so we re-send the
 * indicator on this interval to keep it visible until the reply is sent.
 * A platform that expires it sooner sets `typingRefreshMs` on its adapter.
 */
export const MESSAGE_TYPING_REFRESH_MS = 9000;
