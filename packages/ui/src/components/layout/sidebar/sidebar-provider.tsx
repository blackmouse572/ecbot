import { type PropsWithChildren, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { SidebarContext } from "./sidebar-context";

type SidebarProviderProps = PropsWithChildren<{
  /** Initial desktop-open state. Defaults to `true` so existing callers are unchanged. */
  defaultDesktopOpen?: boolean;
}>;

export const SidebarProvider = ({ children, defaultDesktopOpen = true }: SidebarProviderProps) => {
  const [desktop, setDesktop] = useState(defaultDesktopOpen);
  const [mobile, setMobile] = useState(false);

  const { pathname } = useLocation();

  const toggle = (view: "desktop" | "mobile") => {
    if (view === "desktop") {
      setDesktop(!desktop);
    } else {
      setMobile(!mobile);
    }
  };

  // close the mobile sidebar on route change
  // this is to prevent the sidebar from staying open
  // when navigating to a new page
  useEffect(() => {
    setMobile(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ desktop, mobile, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};
