import { useAtom } from "jotai";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CUSTOMER_PANEL, PANEL_PARAM, SMALL_SCREEN_QUERY } from "../constants";
import { conversationSidebarOpenAtom } from "../state";

/**
 * Open/toggle state for the customer side panel.
 *
 * - Desktop: backed by a persisted atom so the choice survives thread switches
 *   (issue #246 (b)).
 * - Small screens: defaults collapsed, without overwriting the desktop
 *   preference (issue #246 (a)). The panel is its own screen, kept in
 *   `?panel=customer` so the phone's back gesture steps details → thread.
 */
export const useConversationSidebar = () => {
  const isMobile = useMediaQuery(SMALL_SCREEN_QUERY);
  const [persistedOpen, setPersistedOpen] = useAtom(
    conversationSidebarOpenAtom,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mobileOpen = searchParams.get(PANEL_PARAM) === CUSTOMER_PANEL;

  const toggleMobile = () => {
    if (!mobileOpen) {
      const next = new URLSearchParams(searchParams);
      next.set(PANEL_PARAM, CUSTOMER_PANEL);
      setSearchParams(next, { state: { panelPushed: true } });
    } else if ((location.state as A)?.panelPushed) {
      // We pushed this entry, so pop it: back then leaves the thread.
      navigate(-1);
    } else {
      // Landed here from a link: drop the param in place.
      const next = new URLSearchParams(searchParams);
      next.delete(PANEL_PARAM);
      setSearchParams(next, { replace: true });
    }
  };

  const open = isMobile ? mobileOpen : persistedOpen;
  const toggle = () => {
    if (isMobile) {
      toggleMobile();
    } else {
      setPersistedOpen((v) => !v);
    }
  };

  return { open, toggle, isMobile };
};
