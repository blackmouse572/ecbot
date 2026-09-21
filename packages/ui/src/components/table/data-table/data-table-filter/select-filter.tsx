import { CheckMini, EllipseMiniSolid, XMarkMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { Command } from "cmdk";
import { Popover as RadixPopover } from "radix-ui";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSelectedParams } from "../hooks";
import { useDataTableFilterContext } from "./context";
import FilterChip from "./filter-chip";
import type { IFilter } from "./types";

interface SelectFilterProps extends IFilter {
  options: {
    label: string;
    value: unknown;
    renderItem?: () => React.ReactNode;
  }[];
  readonly?: boolean;
  multiple?: boolean;
  searchable?: boolean;
}

export const SelectFilter = ({
  filter,
  prefix,
  readonly,
  multiple,
  searchable,
  options,
  openOnMount,
}: SelectFilterProps) => {
  const [open, setOpen] = useState(openOnMount);
  const [search, setSearch] = useState("");
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const { t } = useTranslation();
  const { removeFilter } = useDataTableFilterContext();

  const { key, label } = filter;
  const selectedParams = useSelectedParams({ param: key, prefix, multiple });
  const currentValue = selectedParams.get();

  const labelValues = currentValue
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean) as string[];

  const [previousValue, setPreviousValue] = useState<
    string | string[] | undefined
  >(labelValues);

  const handleRemove = () => {
    selectedParams.delete();
    removeFilter(key);
  };

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const handleOpenChange = (open: boolean) => {
    setOpen(open);

    setPreviousValue(labelValues);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!open && !currentValue.length) {
      timeoutId = setTimeout(() => {
        removeFilter(key);
      }, 200);
    }
  };

  const handleClearSearch = () => {
    setSearch("");

    if (searchRef) {
      searchRef.focus();
    }
  };

  const handleSelect = (value: unknown) => {
    const isSelected = selectedParams.get().includes(String(value));

    if (isSelected) {
      selectedParams.delete(String(value));
    } else {
      selectedParams.add(String(value));
    }
  };

  const normalizedValues = labelValues
    ? Array.isArray(labelValues)
      ? labelValues
      : [labelValues]
    : null;
  const normalizedPrev = previousValue
    ? Array.isArray(previousValue)
      ? previousValue
      : [previousValue]
    : null;

  return (
    <RadixPopover.Root modal open={open} onOpenChange={handleOpenChange}>
      <FilterChip
        hasOperator
        hadPreviousValue={!!normalizedPrev?.length}
        readonly={readonly}
        label={label}
        value={normalizedValues?.join(", ")}
        onRemove={handleRemove}
      />
      {!readonly && (
        <RadixPopover.Portal>
          <RadixPopover.Content
            hideWhenDetached
            align="start"
            sideOffset={8}
            collisionPadding={8}
            // `h-full max-h-[200px]` is load-bearing: it is the only definite
            // height in the chain down to Command.List, which needs one to
            // scroll instead of growing unbounded.
            className={clx(
              "bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-[1] h-full max-h-[200px] w-[300px] overflow-hidden rounded-lg outline-none",
            )}
            onInteractOutside={(e) => {
              if (e.target instanceof HTMLElement) {
                if (
                  e.target.attributes.getNamedItem("data-name")?.value ===
                  "filters_menu_content"
                ) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            }}
          >
            {/* cmdk does the filtering, and it is what drives Command.Empty.
                `search` below only controls the clear button. */}
            <Command className="h-full">
              {searchable && (
                <div className="border-b p-1">
                  <div className="grid grid-cols-[1fr_20px] gap-x-2 rounded-md px-2 py-1">
                    <Command.Input
                      ref={setSearchRef}
                      value={search}
                      onValueChange={setSearch}
                      className="txt-compact-small placeholder:text-ui-fg-muted bg-transparent outline-none"
                      placeholder="Search"
                    />
                    <div className="flex h-5 w-5 items-center justify-center">
                      <button
                        disabled={!search}
                        onClick={handleClearSearch}
                        className={clx(
                          "transition-fg text-ui-fg-muted focus-visible:bg-ui-bg-base-pressed rounded-md outline-none",
                          { invisible: !search },
                        )}
                      >
                        <XMarkMini />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <Command.Empty className="txt-compact-small flex items-center justify-center p-1">
                <span className="w-full px-2 py-1 text-center">
                  {t("general.noResultsTitle")}
                </span>
              </Command.Empty>
              {/* Command.List is not optional decoration: it is the only thing
                  that registers items with cmdk, so without it arrow-key
                  navigation, Enter and aria-selected are all dead. */}
              <Command.List className="h-full max-h-[163px] min-h-[0] overflow-auto p-1 outline-none">
                {options.map((option) => {
                  const isSelected = selectedParams
                    .get()
                    .includes(String(option.value));

                  return (
                    <Command.Item
                      key={String(option.value)}
                      className="bg-ui-bg-base hover:bg-ui-bg-base-hover aria-selected:bg-ui-bg-base-pressed focus-visible:bg-ui-bg-base-pressed text-ui-fg-base txt-compact-small relative flex cursor-pointer items-center gap-x-2 rounded-md px-2 py-1.5 outline-none transition-colors"
                      value={String(option.value)}
                      // cmdk scores the `value`, which for most consumers is an
                      // id the user never sees — searching "Olivia" against
                      // `value="3f1c9a2e-…"` would hide every option. The label
                      // has to be handed over explicitly.
                      // Guarded: cmdk calls .trim() on every keyword, and
                      // several callers build `label` behind an `as` cast that
                      // can hand over undefined at runtime.
                      keywords={option.label ? [option.label] : []}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <div
                        className={clx(
                          "transition-fg flex h-5 w-5 items-center justify-center",
                          { "[&_svg]:invisible": !isSelected },
                        )}
                      >
                        {multiple ? <CheckMini /> : <EllipseMiniSolid />}
                      </div>
                      {option.renderItem ? option.renderItem() : option.label}
                    </Command.Item>
                  );
                })}
              </Command.List>
            </Command>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      )}
    </RadixPopover.Root>
  );
};
