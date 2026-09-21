import { useState } from "react";

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
 */
export function useVisitorId(widgetKey: string | undefined): string {
  const [visitorId] = useState(() => {
    const key = `${STORAGE_KEY}.${widgetKey ?? "default"}`;
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;
      const minted = crypto.randomUUID();
      window.localStorage.setItem(key, minted);
      return minted;
    } catch {
      return crypto.randomUUID();
    }
  });

  return visitorId;
}
