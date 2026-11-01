import { latestCustomerConversationQueryOptions } from "@/hooks/api/conversations";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";
import { MagnifyingGlass } from "@medusajs/icons";
import { Text } from "@medusajs/ui";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
      <CommandInput
        icon={<MagnifyingGlass />}
        value={query}
        onValueChange={setQuery}
        placeholder={t("commandPalette.placeholder")}
      />
      <CommandList className="max-h-[min(420px,60svh)]">
        {isSearching && visibleGroups.length === 0 ? (
          <Text size="small" className="text-ui-fg-muted px-5 py-6 text-center">
            {t("commandPalette.searching")}
          </Text>
        ) : (
          <CommandEmpty>
            {t("commandPalette.empty", { query: query.trim() })}
          </CommandEmpty>
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
    </>
  );
};
