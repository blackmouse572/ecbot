import { useCallback, useState } from "react";

const STORAGE_KEY = "eccho.widget.visitorId";

/**
 * Anonymous, per-browser visitor id — the widget's `senderId`.
 *
 * Persisted so a visitor who reloads or navigates lands back in the same
 * conversation instead of starting a fresh one each page. Stored per widget key
 * so two widgets on one site do not share an identity.
 *
 * localStorage can throw (private mode, blocked third-party storage). Falling
 * back to a per-session id degrades continuity, not function — the visitor can
 * still chat, they just get a new conversation.
 *
 * `resetVisitorId` mints a fresh id: the server resolves the conversation from
 * it, so this is how "start over" gets an empty conversation.
 */
export function useVisitorId(widgetKey: string | undefined) {
  const storageKey = `${STORAGE_KEY}.${widgetKey ?? "default"}`;

  const [visitorId, setVisitorId] = useState(() => {
    try {
      const existing = window.localStorage.getItem(storageKey);
      if (existing) return existing;
      const minted = crypto.randomUUID();
      window.localStorage.setItem(storageKey, minted);
      return minted;
    } catch {
      return crypto.randomUUID();
    }
  });

  const resetVisitorId = useCallback(() => {
    const minted = crypto.randomUUID();
    try {
      window.localStorage.setItem(storageKey, minted);
    } catch {
      // Storage blocked: the new id still lasts for this page load.
    }
    setVisitorId(minted);
  }, [storageKey]);

  return { visitorId, resetVisitorId };
}
