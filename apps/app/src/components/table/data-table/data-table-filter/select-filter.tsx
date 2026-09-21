import { CheckMini, EllipseMiniSolid, XMarkMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Command } from "cmdk";
import { Popover as RadixPopover } from "radix-ui";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSelectedParams } from "../hooks";
import { useDataTableFilterContext } from "./context";
import FilterChip from "./filter-chip";
import type { IFilter } from "./types";

type SelectFilterOption = {
  label: string;
  value: unknown;
  renderItem?(): React.ReactNode;
};

interface SelectFilterProps extends IFilter {
  options: SelectFilterOption[];
  readonly?: boolean;
  multiple?: boolean;
  searchable?: boolean;
}

const REMOVE_WHEN_EMPTY_DELAY_MS = 200;

/** A value that may come back as a single string or an array, normalized to an array (or null when empty). */
const toValueArray = (value?: string | string[]) =>
  value ? (Array.isArray(value) ? value : [value]) : null;

export const SelectFilter = ({
  filter,
  prefix,
  readonly,
  multiple,
  searchable,
  options,
  openOnMount,
}: SelectFilterProps) => {
  const { key: filterKey, label: filterLabel } = filter;
  const { t } = useTranslation(),
    { removeFilter } = useDataTableFilterContext(),
    selectedParams = useSelectedParams({ param: filterKey, prefix, multiple });

  const [open, setOpen] = useState(openOnMount),
    [search, setSearch] = useState(""),
    [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const selectedValues = selectedParams.get();
  const selectedLabels = selectedValues
    .map((value) => options.find((o) => o.value === value)?.label)
    .filter((label): label is string => Boolean(label));

  const [previousLabels, setPreviousLabels] = useState<
    string | string[] | undefined
  >(selectedLabels);

  let pendingRemoveTimer: ReturnType<typeof setTimeout> | null = null;

  const handleRemove = () => {
    selectedParams.delete(undefined);
    removeFilter(filterKey);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setPreviousLabels(selectedLabels);

    if (pendingRemoveTimer) {
      clearTimeout(pendingRemoveTimer);
    }

    if (!nextOpen && !selectedValues.length) {
      pendingRemoveTimer = setTimeout(() => {
        removeFilter(filterKey);
      }, REMOVE_WHEN_EMPTY_DELAY_MS);
    }
  };

  const handleClearSearch = () => {
    setSearch(() => "");
    searchRef?.focus();
  };

  const handleSelect = (value: unknown) => {
    const stringValue = String(value);
    const alreadySelected = selectedParams.get().includes(stringValue);

    if (alreadySelected) {
      selectedParams.delete(stringValue);
    } else {
      selectedParams.add(stringValue);
    }
  };

  const normalizedValues = toValueArray(selectedLabels);
  const normalizedPrev = toValueArray(previousLabels);

  // Filtered options driven by the cmdk search value when searchable.
  const [filteredOptions, setFilteredOptions] = useState(options);
  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const needle = value.toLowerCase();
    setFilteredOptions(
      needle
        ? options.filter((o) => String(o.label).toLowerCase().includes(needle))
        : options,
    );
  };

  return (
    <RadixPopover.Root modal open={open} onOpenChange={handleOpenChange}>
      <FilterChip
        hasOperator
        hadPreviousValue={!!normalizedPrev?.length}
        readonly={readonly}
        label={filterLabel}
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
            className={clx(
              "bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-[1] w-[300px] overflow-hidden rounded-lg outline-none",
            )}
            onInteractOutside={(e) => {
              const targetName =
                e.target instanceof HTMLElement
                  ? e.target.attributes.getNamedItem("data-name")?.value
                  : undefined;

              if (targetName === "filters_menu_content") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <Command shouldFilter={false} className="h-full">
              {searchable && (
                <div className="border-b p-1">
                  <div className="grid grid-cols-[1fr_20px] gap-x-2 rounded-md px-2 py-1">
                    <Command.Input
                      ref={setSearchRef}
                      value={search}
                      onValueChange={handleSearchChange}
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
              {filteredOptions.length === 0 ? (
                <div className="txt-compact-small flex items-center justify-center p-1">
                  <span className="w-full px-2 py-1 text-center">
                    {t("general.noResultsTitle")}
                  </span>
                </div>
              ) : (
                <div
                  ref={listRef}
                  className="h-full max-h-[200px] min-h-0 overflow-auto p-1 outline-none"
                >
                  <div
                    style={{
                      height: virtualizer.getTotalSize(),
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {virtualizer.getVirtualItems().map((row) => {
                      const option = filteredOptions[row.index];
                      const isSelected = selectedValues.includes(
                        String(option.value),
                      );

                      return (
                        <Command.Item
                          key={String(option.value)}
                          className="bg-ui-bg-base hover:bg-ui-bg-base-hover aria-selected:bg-ui-bg-base-pressed focus-visible:bg-ui-bg-base-pressed text-ui-fg-base txt-compact-small absolute left-0 top-0 flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 outline-none transition-colors"
                          style={{
                            height: row.size,
                            transform: `translateY(${row.start}px)`,
                          }}
                          value={String(option.value)}
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
                          {option.renderItem
                            ? option.renderItem()
                            : option.label}
                        </Command.Item>
                      );
                    })}
                  </div>
                </div>
              )}
            </Command>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      )}
    </RadixPopover.Root>
  );
};
