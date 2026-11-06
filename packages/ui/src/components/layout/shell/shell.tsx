import { clx } from "@medusajs/ui";
import { type ReactNode } from "react";
import { Outlet, useMatches, useNavigation } from "react-router-dom";
import { DesktopSidebarContainer } from "./desktop-sidebar-container";
import { Gutter } from "./gutter";
import {
  type MobileNavLabels,
  MobileSidebarContainer,
} from "./mobile-sidebar-container";
import { NavigationBar } from "./navigation-bar";
import { Topbar } from "./topbar";

export type ShellProps = {
  children: ReactNode;
  mobileNavLabels: MobileNavLabels;
  topbarActions?: ReactNode;
};

export const Shell = ({
  children,
  mobileNavLabels,
  topbarActions,
}: ShellProps) => {
  const navigation = useNavigation();

  const loading = navigation.state === "loading";
  // A route with `handle: { private: true }` shows customer data: tag the
  // page (breadcrumbs included) so analytics tools can mask it.
  const isPrivate = useMatches().some(
    (match) => (match.handle as { private?: boolean } | undefined)?.private,
  );

  return (
    <div className="relative flex h-screen flex-col items-start overflow-hidden lg:flex-row">
      <NavigationBar loading={loading} />
      <div>
        <MobileSidebarContainer mobileNavLabels={mobileNavLabels}>
          {children}
        </MobileSidebarContainer>
        <DesktopSidebarContainer>{children}</DesktopSidebarContainer>
      </div>
      <div
        className="flex h-screen w-full flex-col overflow-auto"
        data-private={isPrivate || undefined}
      >
        <Topbar topbarActions={topbarActions} />
        <main
          className={clx(
            "flex h-full w-full flex-col items-center overflow-y-auto transition-opacity delay-200 duration-200",
            {
              "opacity-25": loading,
            },
          )}
        >
          <Gutter>
            <Outlet />
          </Gutter>
        </main>
      </div>
    </div>
  );
};
