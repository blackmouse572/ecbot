import {
  BookOpen,
  CircleHalfSolid,
  EllipsisHorizontal,
  OpenRectArrowOut,
  TimelineVertical,
  User as UserIcon,
} from "@medusajs/icons";
import { Avatar, DropdownMenu, Text, clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { useLogout, useMe } from "@/hooks/api";
import { Skeleton } from "@repo/ui/common-components";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../../providers/theme-provider";

export const UserMenu = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const [openMenu, setOpenMenu] = useState(false);

  return (
    <div>
      <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
        <UserBadge />
        <DropdownMenu.Content className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)]">
          <UserItem />
          <DropdownMenu.Separator />
          <DropdownMenu.Item asChild>
            <Link to="/settings/profile" state={{ from: location.pathname }}>
              <UserIcon className="text-ui-fg-subtle mr-2" />
              {t("app.menus.user.profileSettings")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item asChild>
            <Link to="https://docs.medusajs.com" target="_blank">
              <BookOpen className="text-ui-fg-subtle mr-2" />
              {t("app.menus.user.documentation")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="https://medusajs.com/changelog/" target="_blank">
              <TimelineVertical className="text-ui-fg-subtle mr-2" />
              {t("app.menus.user.changelog")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <ThemeToggle />
          <DropdownMenu.Separator />
          <Logout />
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};

const UserBadge = () => {
  const { user, isPending, isError, error } = useMe();

  const name = user?.name;
  const displayName = name || user?.email;

  const fallback = displayName ? displayName[0].toUpperCase() : null;

  if (isPending) {
    return (
      <button className="shadow-borders-base flex max-w-[192px] select-none items-center gap-x-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-full py-1 pl-1 pr-2.5">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-[9px] w-[70px]" />
      </button>
    );
  }

  if (isError) {
    throw error;
  }

  return (
    <div className="p-3">
      <DropdownMenu.Trigger
        disabled={!user}
        className={clx(
          "bg-ui-bg-subtle grid w-full cursor-pointer grid-cols-[24px_1fr_15px] items-center gap-2 rounded-md py-1 pl-0.5 pr-2 outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "data-[state=open]:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus",
        )}
      >
        <div className="flex size-6 items-center justify-center">
          {fallback ? (
            <Avatar
              size="xsmall"
              fallback={fallback}
              src={user?.photo?.cdnUrl}
            />
          ) : (
            <Skeleton className="h-6 w-6 rounded-full" />
          )}
        </div>
        <div className="flex items-center overflow-hidden">
          {displayName ? (
            <Text
              size="xsmall"
              weight="plus"
              leading="compact"
              className="truncate"
            >
              {displayName}
            </Text>
          ) : (
            <Skeleton className="h-[9px] w-[70px]" />
          )}
        </div>
        <EllipsisHorizontal className="text-ui-fg-muted" />
      </DropdownMenu.Trigger>
    </div>
  );
};

const ThemeToggle = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu.SubMenu>
      <DropdownMenu.SubMenuTrigger className="rounded-md">
        <div className="flex-1 flex items-center">
          <CircleHalfSolid className="text-ui-fg-subtle mr-2" />
          {t("app.menus.user.theme.label")}
        </div>
      </DropdownMenu.SubMenuTrigger>
      <DropdownMenu.SubMenuContent className="min-w-[200px]">
        <DropdownMenu.RadioGroup value={theme} className="[&>div]:pl-8">
          <DropdownMenu.RadioItem
            value="system"
            onClick={(e) => {
              e.preventDefault();
              setTheme("system");
            }}
          >
            {t("app.menus.user.theme.system")}
          </DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem
            value="light"
            onClick={(e) => {
              e.preventDefault();
              setTheme("light");
            }}
          >
            {t("app.menus.user.theme.light")}
          </DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem
            value="dark"
            onClick={(e) => {
              e.preventDefault();
              setTheme("dark");
            }}
          >
            {t("app.menus.user.theme.dark")}
          </DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
      </DropdownMenu.SubMenuContent>
    </DropdownMenu.SubMenu>
  );
};

const Logout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = useLogout();

  const handleLogout = async () => {
    logout();
    navigate("/login");
    queryClient.clear();
  };

  return (
    <DropdownMenu.Item onClick={handleLogout}>
      <div className="flex items-center gap-x-2">
        <OpenRectArrowOut className="text-ui-fg-subtle" />
        <span>{t("app.menus.actions.logout")}</span>
      </div>
    </DropdownMenu.Item>
  );
};

const UserItem = () => {
  const { isPending, user, isError, error } = useMe();

  const loaded = !isPending && !!user;

  if (!loaded) {
    return <div></div>;
  }

  const name = user.name;
  const email = user.email;
  const fallback = name ? name[0].toUpperCase() : email[0].toUpperCase();
  const avatar = user.photo?.cdnUrl;

  if (isError) {
    throw error;
  }

  return (
    <div className="flex items-center gap-x-3 overflow-hidden px-2 py-1">
      <Avatar
        size="small"
        variant="rounded"
        src={avatar || undefined}
        fallback={fallback}
      />
      <div className="block w-full min-w-0 max-w-[187px] overflow-hidden whitespace-nowrap">
        <Text
          size="small"
          weight="plus"
          leading="compact"
          className="overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {name || email}
        </Text>
        {!!name && (
          <Text
            size="xsmall"
            leading="compact"
            className="text-ui-fg-subtle overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {email}
          </Text>
        )}
      </div>
    </div>
  );
};
