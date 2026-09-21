import { useAtom } from "jotai";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { conversationSidebarOpenAtom } from "../state";

// Breakpoint below which the conversation view is cramped enough that the
// customer side panel should start collapsed.
const SMALL_SCREEN = "(max-width: 768px)";

/**
 * Open/toggle state for the customer side panel.
 *
 * - Desktop: backed by a persisted atom so the choice survives thread switches
 *   (issue #246 (b)).
 * - Small screens: defaults collapsed and toggles ephemerally, without
 *   overwriting the desktop preference (issue #246 (a)).
 */
export const useConversationSidebar = () => {
  const isMobile = useMediaQuery(SMALL_SCREEN);
  const [persistedOpen, setPersistedOpen] = useAtom(
    conversationSidebarOpenAtom,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const open = isMobile ? mobileOpen : persistedOpen;
  const toggle = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setPersistedOpen((v) => !v);
    }
  };

  return { open, toggle };
};
