import {
  CheckMini,
  ChevronUpDown,
  CogSixTooth,
  Key,
  PlusMini,
  Users,
} from "@medusajs/icons";
import { Avatar, DropdownMenu, Text, clx } from "@medusajs/ui";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import { Skeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useMe } from "@/hooks/api";
import { switchWorkspacePath } from "@/libs/workspace-switch-path";
import { ROUTES } from "@/routes/constants";
import { useWorkspaceRoleLabel } from "./use-workspace-role-label";

interface WorkspaceSwitcherProps {
  workspace: WorkSpaceGetResponseDto;
  workspaces: WorkSpaceGetResponseDto[];
}

const initials = (name: string) => name.substring(0, 2).toUpperCase();

/**
 * The workspace menu at the top of the main and workspace settings sidebars:
 * the current workspace and the user's role, links into its settings, and
 * the other workspaces to switch to.
 */
export const WorkspaceSwitcher = ({
  workspace,
  workspaces,
}: WorkspaceSwitcherProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useMe();
  const roleLabel = useWorkspaceRoleLabel(user);

  const others = workspaces.filter((ws) => ws.id !== workspace.id);
  const settingsBase = `/${workspace.slug}/${ROUTES.Settings}`;
  const settingsLinks = [
    {
      to: `${settingsBase}/${ROUTES.Workspace}`,
      icon: <CogSixTooth className="text-ui-fg-subtle" />,
      label: t("app.nav.main.storeSettings"),
    },
    {
      to: `${settingsBase}/${ROUTES.WorkspaceMember}`,
      icon: <Users className="text-ui-fg-subtle" />,
      label: t("app.nav.members.header"),
    },
    {
      to: `${settingsBase}/${ROUTES.ClientCredentials}`,
      icon: <Key className="text-ui-fg-subtle" />,
      label: t("settings.clientCredentials.title"),
    },
  ];

  return (
    <div className="w-full p-3">
      <DropdownMenu>
        <DropdownMenu.Trigger
          className={clx(
            "bg-ui-bg-subtle transition-fg grid w-full grid-cols-[24px_1fr_15px] items-center gap-x-3 rounded-md p-0.5 pr-2 text-left outline-none",
            "hover:bg-ui-bg-subtle-hover",
            "data-[state=open]:bg-ui-bg-subtle-hover",
            "focus-visible:shadow-borders-focus",
          )}
        >
          <Avatar
            variant="squared"
            size="xsmall"
            fallback={initials(workspace.name)}
            src={workspace.avatar}
          />
          <div className="flex flex-col overflow-hidden">
            {workspace.name ? (
              <Text
                size="small"
                weight="plus"
                leading="compact"
                className="truncate"
              >
                {workspace.name}
              </Text>
            ) : (
              <Skeleton className="h-[9px] w-[120px]" />
            )}
            {roleLabel && (
              <Text
                size="xsmall"
                leading="compact"
                className="text-ui-fg-subtle truncate"
              >
                {roleLabel}
              </Text>
            )}
          </div>
          <ChevronUpDown className="text-ui-fg-muted" />
        </DropdownMenu.Trigger>

        {/* z-50 keeps the menu above the sidebar's sticky z-10 blocks. */}
        <DropdownMenu.Content className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
          {/* The current workspace is a label, not a link. */}
          <div
            className="flex items-center gap-x-2 px-2 py-1.5"
            data-testid="current-workspace"
          >
            <Avatar
              variant="squared"
              size="xsmall"
              fallback={initials(workspace.name)}
              src={workspace.avatar}
            />
            <Text
              size="small"
              weight="plus"
              leading="compact"
              className="flex-1 truncate"
            >
              {workspace.name}
            </Text>
            <CheckMini
              className="text-ui-fg-interactive shrink-0"
              aria-label={t("workspace.switcher.current")}
            />
          </div>
          {settingsLinks.map((link) => (
            <DropdownMenu.Item key={link.to} className="gap-x-2" asChild>
              <Link to={link.to} state={{ from: location.pathname }}>
                {link.icon}
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          {others.length > 0 && (
            <>
              <DropdownMenu.Separator />
              <div className="max-h-56 overflow-y-auto">
                {others.map((ws) => (
                  <DropdownMenu.Item
                    key={ws.id}
                    className="gap-x-2"
                    onClick={() =>
                      navigate(
                        switchWorkspacePath(
                          location.pathname,
                          workspace.slug,
                          ws.slug,
                        ),
                      )
                    }
                  >
                    <Avatar
                      variant="squared"
                      size="xsmall"
                      fallback={initials(ws.name)}
                      src={ws.avatar}
                    />
                    <span className="truncate">{ws.name}</span>
                  </DropdownMenu.Item>
                ))}
              </div>
            </>
          )}

          <DropdownMenu.Separator />
          <DropdownMenu.Item className="gap-x-2" asChild>
            <Link to={`/${ROUTES.Onboard}/${ROUTES.OnboardCreate}`}>
              <PlusMini className="text-ui-fg-subtle" />
              {t("onboard.select.create.label")}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
