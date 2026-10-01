import { useAtom } from "jotai";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SMALL_SCREEN_QUERY } from "../constants";
import { conversationSidebarOpenAtom } from "../state";

/**
 * Open/toggle state for the customer side panel.
 *
 * - Desktop: backed by a persisted atom so the choice survives thread switches
 *   (issue #246 (b)).
 * - Small screens: defaults collapsed and toggles ephemerally, without
 *   overwriting the desktop preference (issue #246 (a)). `isMobile` lets the
 *   view stack the panel as its own screen instead of a split.
 */
export const useConversationSidebar = () => {
  const isMobile = useMediaQuery(SMALL_SCREEN_QUERY);
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

  return { open, toggle, isMobile };
};
