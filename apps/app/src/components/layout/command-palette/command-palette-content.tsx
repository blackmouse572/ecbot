import { latestCustomerConversationQueryOptions } from "@/hooks/api/conversations";
import { useScrollEdges } from "@/hooks/use-scroll-edges";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";
import { MagnifyingGlass, Spinner } from "@medusajs/icons";
import { NoRecords } from "@repo/ui/common-components";
import {
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@repo/ui/components";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CommandPaletteLoading } from "./command-palette-loading";
import { ScrollEdgeBlur } from "../main-layout/scroll-edge-blur";
import type { CommandPaletteGroup, CommandPaletteItem } from "./types";
import { useCommandPalettePages } from "./use-command-palette-pages";
import { useCommandPaletteSearch } from "./use-command-palette-search";
import { normalizeSearch } from "./utils";

type CommandPaletteContentProps = {
  onClose: () => void;
};

/** The palette body. Mounted only while open, so the query resets on close. */
export const CommandPaletteContent: FC<CommandPaletteContentProps> = ({
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspaceSlug } = useWorkspaceParams();
  const [query, setQuery] = useState("");
  const pages = useCommandPalettePages();
  const { groups, isSearching } = useCommandPaletteSearch(query);

  const needle = normalizeSearch(query);
  const matches = (item: CommandPaletteItem) =>
    normalizeSearch(item.label).includes(needle);

  // Entity groups come back already searched by the server; pages are
  // filtered here. Before typing, recent agents and quick actions lead.
  const pageGroup: CommandPaletteGroup = {
    key: "pages",
    heading: t("commandPalette.groups.pages"),
    items: pages.filter(matches),
  };
  const visibleGroups = (
    needle ? [pageGroup, ...groups] : [...groups, pageGroup]
  ).filter((group) => group.items.length > 0);
  const rowCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);
  const edges = useScrollEdges(`${query}:${rowCount}`);

  // A customer has no page of their own: open their latest conversation,
  // or the customer list filtered to them when they have none.
  const openCustomer = async (item: CommandPaletteItem) => {
    const conversationId = await queryClient
      .fetchQuery(
        latestCustomerConversationQueryOptions(workspaceSlug, item.customerId!),
      )
      .catch(() => null);
    navigate(
      conversationId
        ? `/${workspaceSlug}/${ROUTES.Conversations}/${conversationId}`
        : `/${workspaceSlug}/${ROUTES.Customers}?search=${encodeURIComponent(item.label)}`,
    );
  };

  const select = (item: CommandPaletteItem) => {
    onClose();
    if (item.customerId) {
      void openCustomer(item);
    } else if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <>
      <div className="bg-ui-bg-base relative z-10">
        <CommandInput
          icon={<MagnifyingGlass />}
          value={query}
          onValueChange={setQuery}
          placeholder={t("commandPalette.placeholder")}
          suffix={
            isSearching ? (
              <Spinner
                className="text-ui-fg-muted shrink-0 animate-spin"
                aria-label={t("commandPalette.searching")}
              />
            ) : (
              <CommandShortcut aria-hidden>Esc</CommandShortcut>
            )
          }
        />
        <ScrollEdgeBlur
          side="top"
          visible={edges.top}
          fadeFrom="from-ui-bg-base"
          className="h-12"
        />
      </div>
      <CommandList
        ref={edges.ref}
        onScroll={edges.onScroll}
        className="max-h-[min(420px,60svh)]"
      >
        {isSearching && visibleGroups.length === 0 && <CommandPaletteLoading />}
        {!isSearching && visibleGroups.length === 0 && (
          <NoRecords
            size="small"
            className="py-8"
            icon={<MagnifyingGlass />}
            title={t("commandPalette.empty", { query: query.trim() })}
            message={t("commandPalette.emptyHint")}
          />
        )}
        {visibleGroups.map((group) => (
          <CommandGroup key={group.key} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${group.key}:${item.id}`}
                onSelect={() => select(item)}
                className="flex items-center gap-x-2 [&>svg]:text-ui-fg-subtle"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.hint && (
                  <span className="text-ui-fg-muted ml-auto shrink-0 truncate">
                    {item.hint}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <footer className="border-ui-border-base text-ui-fg-muted txt-compact-xsmall bg-ui-bg-base relative z-10 flex items-center gap-x-4 border-t px-5 py-2.5">
        <ScrollEdgeBlur
          side="bottom"
          visible={edges.bottom}
          fadeFrom="from-ui-bg-base"
          className="h-12"
        />
        <span className="flex items-center gap-x-1.5">
          <CommandShortcut>↑</CommandShortcut>
          <CommandShortcut>↓</CommandShortcut>
          {t("commandPalette.footer.navigate")}
        </span>
        <span className="flex items-center gap-x-1.5">
          <CommandShortcut>↵</CommandShortcut>
          {t("commandPalette.footer.open")}
        </span>
      </footer>
    </>
  );
};
