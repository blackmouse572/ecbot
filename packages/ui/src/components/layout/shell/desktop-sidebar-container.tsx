import { clx } from "@medusajs/ui";
import { type PropsWithChildren } from "react";
import { useSidebar } from "../sidebar";

export const DesktopSidebarContainer = ({ children }: PropsWithChildren) => {
  const { desktop } = useSidebar();

  return (
    <div
      // `isolate`: the sidebar's own layers (its pinned header and footer)
      // stack inside it, never above a modal opened over the page.
      className={clx("isolate hidden h-screen w-[220px] border-r", {
        "lg:flex": desktop,
      })}
    >
      {children}
    </div>
  );
};
