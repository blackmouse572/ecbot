import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ChevronDownMini, PlusMini } from "@medusajs/icons";
import { Button, DropdownMenu } from "@medusajs/ui";
import {
  IconApi,
  IconLayoutGrid,
  IconPlugConnected,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** Store first; HTTP and MCP sit below, for developers. */
export const ToolAddMenu = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const base = `/${workspaceSlug}/tools`;

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button size="small" variant="primary">
          <PlusMini />
          {t("tools.addMenu.button")}
          <ChevronDownMini className="size-3" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-[280px]">
        <DropdownMenu.Item asChild className="gap-x-2">
          <Link to={`${base}/marketplace`}>
            <IconLayoutGrid size={16} className="text-ui-fg-subtle" />
            {t("tools.addMenu.store")}
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Label className="px-2 py-1.5">
          {t("tools.addMenu.customLabel")}
        </DropdownMenu.Label>
        <DropdownMenu.Item asChild className="gap-x-2">
          <Link to={`${base}/new/http`}>
            <IconApi size={16} className="text-ui-fg-subtle" />
            {t("tools.addMenu.http")}
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild className="gap-x-2">
          <Link to={`${base}/new/mcp`}>
            <IconPlugConnected size={16} className="text-ui-fg-subtle" />
            {t("tools.addMenu.mcp")}
          </Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
