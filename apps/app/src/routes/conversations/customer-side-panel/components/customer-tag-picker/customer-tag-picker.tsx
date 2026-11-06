import { normalizeSearch } from "@/components/layout/command-palette/utils";
import {
  useCreateCustomerTag,
  type CustomerTagGetResponseDto,
} from "@/hooks/api/customer-tags";
import { readApiError } from "@/libs/api-error";
import { useAbility } from "@repo/auth";
import { CheckMini, PlusMini } from "@medusajs/icons";
import { Button, clx, toast } from "@medusajs/ui";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components";
import { Popover as RadixPopover } from "radix-ui";
import { useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  tags: CustomerTagGetResponseDto[];
  appliedTagIds: Set<string>;
  onApply: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  disabled?: boolean;
}

// Searchable "Add tag" menu: tags already on the customer show checked and
// toggle off; with nothing matching, members who may create customer tags
// can create one from the query and apply it in the same step.
export const CustomerTagPicker: FC<Props> = ({
  tags,
  appliedTagIds,
  onApply,
  onRemove,
  disabled,
}) => {
  const { t } = useTranslation();
  const ability = useAbility();
  const createTag = useCreateCustomerTag();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Same policy the API checks on POST /customer-tags.
  const canCreate = ability.can("create", "CUSTOMER");
  const trimmed = query.trim();

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return tags;
    return tags.filter((tag) => normalizeSearch(tag.name).includes(needle));
  }, [tags, query]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    setOpen(next);
  };

  const toggle = (tag: CustomerTagGetResponseDto) => {
    if (appliedTagIds.has(tag.id)) onRemove(tag.id);
    else onApply(tag.id);
    setQuery("");
  };

  const createAndApply = async () => {
    if (!trimmed || createTag.isPending) return;
    try {
      const created = await createTag.mutateAsync({ name: trimmed });
      onApply(created.id);
      setQuery("");
    } catch (error) {
      toast.error(
        t(
          // 409: a tag with this name already exists in the workspace.
          readApiError(error).status === 409
            ? "settings.customerTags.errors.nameTaken"
            : "settings.customerTags.toast.createFailed",
        ),
      );
    }
  };

  const showCreate = filtered.length === 0 && !!trimmed && canCreate;

  return (
    <RadixPopover.Root modal open={open} onOpenChange={handleOpenChange}>
      <RadixPopover.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="small"
          disabled={disabled || (tags.length === 0 && !canCreate)}
        >
          {t("conversations.customer.panel.tags.add")}
        </Button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          className="bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-50 w-64 overflow-hidden rounded-lg outline-none"
        >
          <Command shouldFilter={false} loop>
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={t(
                "conversations.customer.panel.tags.searchPlaceholder",
              )}
              className="h-9 py-2"
            />
            <CommandList className="max-h-64">
              {filtered.length === 0 ? (
                <p className="txt-compact-small text-ui-fg-muted px-3 py-3 text-center">
                  {t("conversations.customer.panel.tags.noResults")}
                </p>
              ) : null}
              {filtered.length > 0 ? (
                <CommandGroup className="p-1">
                  {filtered.map((tag) => {
                    const checked = appliedTagIds.has(tag.id);
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.id}
                        aria-checked={checked}
                        onSelect={() => toggle(tag)}
                        className="flex items-center gap-x-2"
                      >
                        <CheckMini
                          aria-hidden
                          className={clx("shrink-0", { invisible: !checked })}
                        />
                        {tag.emoji ? (
                          <span aria-hidden>{tag.emoji}</span>
                        ) : null}
                        <span className="truncate">{tag.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
              {showCreate ? (
                <CommandGroup className="border-ui-border-base border-t p-1">
                  <CommandItem
                    value="__create__"
                    onSelect={createAndApply}
                    disabled={createTag.isPending}
                    className="flex items-center gap-x-2"
                  >
                    <PlusMini aria-hidden className="shrink-0" />
                    <span className="truncate">
                      {t("conversations.customer.panel.tags.create", {
                        query: trimmed,
                      })}
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};
