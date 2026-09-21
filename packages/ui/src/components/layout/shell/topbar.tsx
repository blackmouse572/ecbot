import { SidebarLeft } from "@medusajs/icons";
import { IconButton } from "@medusajs/ui";
import { type ReactNode } from "react";
import { useSidebar } from "../sidebar";
import { Breadcrumbs } from "./breadcrumbs";

export const Topbar = ({ topbarActions }: { topbarActions?: ReactNode }) => {
  return (
    <div className="grid w-full grid-cols-2 border-b p-3">
      <div className="flex items-center gap-x-1.5">
        <ToggleSidebar />
        <Breadcrumbs />
      </div>
      <div className="flex items-center justify-end gap-x-3">
        {topbarActions}
      </div>
    </div>
  );
};

const ToggleSidebar = () => {
  const { toggle } = useSidebar();

  return (
    <div>
      <IconButton
        className="hidden lg:flex"
        variant="transparent"
        onClick={() => toggle("desktop")}
        size="small"
      >
        <SidebarLeft className="text-ui-fg-muted" />
      </IconButton>
      <IconButton
        className="hidden max-lg:flex"
        variant="transparent"
        onClick={() => toggle("mobile")}
        size="small"
      >
        <SidebarLeft className="text-ui-fg-muted" />
      </IconButton>
    </div>
  );
};
