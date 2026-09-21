import { Text, clx } from "@medusajs/ui";
import { Collapsible as RadixCollapsible } from "radix-ui";
import React, { type ReactNode, useCallback, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { type NavAbility, useNavAccess } from "./nav-access-context";

type ItemType = "core" | "extension" | "setting";

type NestedItemProps = {
  label: string;
  to: string;
  icon?: ReactNode;
  badge?: ReactNode;
  ability?: NavAbility;
};

export type INavItem = {
  icon?: ReactNode;
  label: string;
  to: string;
  items?: NestedItemProps[];
  type?: ItemType;
  from?: string;
  end?: boolean;
  badge?: ReactNode;
  ability?: NavAbility;
};

const BASE_NAV_LINK_CLASSES =
  "text-ui-fg-subtle transition-fg hover:bg-ui-bg-subtle-hover flex items-center gap-x-2 rounded-md py-0.5 pl-0.5 pr-2 outline-none [&>svg]:text-ui-fg-subtle focus-visible:shadow-borders-focus";
const ACTIVE_NAV_LINK_CLASSES =
  "bg-ui-bg-base shadow-elevation-card-rest text-ui-fg-base hover:bg-ui-bg-base";
const NESTED_NAV_LINK_CLASSES = "pl-[34px] pr-2 py-1 w-full text-ui-fg-muted";
const SETTING_NAV_LINK_CLASSES = "pl-2 py-1";

export const NavItem = ({
  icon,
  label,
  to,
  items: rawItems,
  type = "core",
  from,
  end,
  ability,
  badge,
}: INavItem) => {
  const { pathname } = useLocation();
  const canAccess = useNavAccess();

  /**
   * Filter by ability up front — `Can` would only blank out the children while
   * leaving the item in the array, so the collapsible trigger, the `h-7` row and
   * the rail height would still be sized for an item the user cannot see.
   */
  const items = useMemo(
    () =>
      rawItems?.filter((item) => !item.ability || canAccess(item.ability)),
    [rawItems, canAccess],
  );

  const [open, setOpen] = useState(true);

  const navLinkClassNames = useCallback(
    ({
      to,
      isActive,
      isNested = false,
      isSetting = false,
    }: {
      to: string;
      isActive: boolean;
      isNested?: boolean;
      isSetting?: boolean;
    }) => {
      if (["core", "setting"].includes(type)) {
        isActive =
          pathname === to || (pathname.startsWith(to + "/") && to !== "/");
      }

      return clx(BASE_NAV_LINK_CLASSES, {
        [NESTED_NAV_LINK_CLASSES]: isNested,
        [ACTIVE_NAV_LINK_CLASSES]: isActive,
        // Setting padding would twMerge-override the nested indent, collapsing
        // sub items onto the tree rail — nested wins.
        [SETTING_NAV_LINK_CLASSES]: isSetting && !isNested,
      });
    },
    [type, pathname],
  );

  const isSetting = type === "setting";

  const Wrapper = ({ children }: React.PropsWithChildren) => {
    if (ability && !canAccess(ability)) return null;
    return <React.Fragment>{children}</React.Fragment>;
  };

  return (
    <Wrapper>
      <div className="px-3">
        <NavLink
          to={to}
          end={end ?? items?.some((i) => i.to === pathname)}
          state={
            from
              ? {
                  from,
                }
              : undefined
          }
          className={({ isActive }) => {
            return clx(navLinkClassNames({ isActive, isSetting, to }), {
              "max-lg:hidden": !!items?.length,
            });
          }}
        >
          {type !== "setting" && (
            <div className="flex size-6 items-center justify-center">
              <Icon icon={icon} type={type} />
            </div>
          )}
          <Text size="small" weight="plus" leading="compact">
            {label}
          </Text>
          {badge && <span className="ml-auto flex items-center">{badge}</span>}
        </NavLink>
        {items && items.length > 0 && (
          <RadixCollapsible.Root open={open} onOpenChange={setOpen}>
            <RadixCollapsible.Trigger
              className={clx(
                "text-ui-fg-subtle hover:text-ui-fg-base transition-fg hover:bg-ui-bg-subtle-hover flex w-full items-center gap-x-2 rounded-md py-0.5 pl-0.5 pr-2 outline-none lg:hidden",
                { "pl-2": isSetting },
              )}
            >
              <div className="flex size-6 items-center justify-center">
                <Icon icon={icon} type={type} />
              </div>
              <Text size="small" weight="plus" leading="compact">
                {label}
              </Text>
            </RadixCollapsible.Trigger>
            <RadixCollapsible.Content>
              <div className="flex flex-col gap-y-0.5 pb-2 pt-0.5">
                <ul className="lg:hidden">
                  <li className="flex w-full items-center gap-x-1">
                    <NavLink
                      to={to}
                      end
                      className={({ isActive }) => {
                        return clx(
                          navLinkClassNames({
                            to,
                            isActive,
                            isSetting,
                            isNested: true,
                          }),
                        );
                      }}
                    >
                      <Text size="small" weight="plus" leading="compact">
                        {label}
                      </Text>
                    </NavLink>
                  </li>
                </ul>
                <div className="relative">
                  {/* rows are h-7 (28px) + gap-y-0.5 (2px), so the last row's center sits at (n - 1) * 30 + 14 */}
                  <div
                    aria-hidden="true"
                    className="border-ui-border-base pointer-events-none absolute left-3.5 top-0 w-4 rounded-bl-md border-b border-l"
                    style={{ height: (items.length - 1) * 30 + 14 }}
                  />
                  <ul className="flex flex-col gap-y-0.5">
                    {items.map((item) => {
                      return (
                        <li key={item.to} className="flex h-7 items-center">
                          <NavLink
                            to={item.to}
                            end
                            className={({ isActive }) => {
                              return clx(
                                navLinkClassNames({
                                  to: item.to,
                                  isActive,
                                  isSetting,
                                  isNested: true,
                                }),
                              );
                            }}
                          >
                            <span className="flex items-center gap-x-1.5">
                              {item.icon && (
                                <div className="flex size-4 items-center justify-center [&>svg]:size-3">
                                  <Icon icon={item.icon} type={type} />
                                </div>
                              )}
                              <Text
                                size="small"
                                weight="plus"
                                leading="compact"
                              >
                                {item.label}
                              </Text>
                            </span>
                            {item.badge && (
                              <span className="ml-auto flex items-center">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </RadixCollapsible.Content>
          </RadixCollapsible.Root>
        )}
      </div>
    </Wrapper>
  );
};

const Icon = ({ icon, type }: { icon?: ReactNode; type: ItemType }) => {
  if (!icon) {
    return null;
  }

  return type === "extension" ? (
    <div className="shadow-borders-base bg-ui-bg-base flex h-5 w-5 items-center justify-center rounded-[4px]">
      <div className="h-[15px] w-[15px] overflow-hidden rounded-sm">{icon}</div>
    </div>
  ) : (
    icon
  );
};
