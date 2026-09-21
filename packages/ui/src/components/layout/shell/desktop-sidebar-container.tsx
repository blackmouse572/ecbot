import { clx } from "@medusajs/ui";
import { type PropsWithChildren } from "react";
import { useSidebar } from "../sidebar";

export const DesktopSidebarContainer = ({ children }: PropsWithChildren) => {
  const { desktop } = useSidebar();

  return (
    <div
      className={clx("hidden h-screen w-[220px] border-r", {
        "lg:flex": desktop,
      })}
    >
      {children}
    </div>
  );
};
