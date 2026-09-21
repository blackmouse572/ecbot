import { Funnel } from "@medusajs/icons";
import { Button, IconButton, clx } from "@medusajs/ui";
import { Popover as RadixPopover } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { DataTableFilterContext, useDataTableFilterContext } from "./context";
import { DateFilter } from "./date-filter";
import { NumberFilter } from "./number-filter";
import { SelectFilter } from "./select-filter";
import { StringFilter } from "./string-filter";

type Option = {
  label: string;
  value: unknown;
  renderItem?(): React.ReactNode;
};

type SelectExtra = { multiple?: boolean; searchable?: boolean };
type SelectFilterFields = { type: "select"; options: Option[] } & SelectExtra;

type SimpleFilterFields<T extends string> = { type: T; options?: never };

export type Filter = { key: string; label: string } & (
  | SelectFilterFields
  | SimpleFilterFields<"date">
  | SimpleFilterFields<"string">
  | SimpleFilterFields<"number">
);

type ActiveFilter = Filter & { openOnMount: boolean };

type DataTableFilterProps = {
  filters: Filter[];
  readonly?: boolean;
  prefix?: string;
  /** Render the trigger as a compact icon button instead of a text button. */
  iconTrigger?: boolean;
};

/** The URLSearchParams key a filter reads/writes, namespaced by `prefix`. */
const paramKeyFor = (filter: Pick<Filter, "key">, prefix?: string) =>
  prefix ? `${prefix}_${filter.key}` : filter.key;

/** Every filter kind hydrates the same way — spreading already carries any
 * type-specific fields (options, multiple, searchable) along. */
const asActiveFilter = (
  filter: Filter,
  openOnMount: boolean,
): ActiveFilter => ({
  ...filter,
  openOnMount,
});

const readActiveFiltersFromUrl = (
  searchParams: URLSearchParams,
  filters: Filter[],
  prefix?: string,
): ActiveFilter[] => {
  const urlParams = new URLSearchParams(searchParams);

  return filters
    .filter((filter) => urlParams.get(paramKeyFor(filter, prefix)))
    .map((filter) => asActiveFilter(filter, false));
};

export const DataTableFilter = ({
  filters,
  readonly,
  prefix,
  iconTrigger,
}: DataTableFilterProps) => {
  const { t } = useTranslation(),
    [searchParams] = useSearchParams();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(() =>
    readActiveFiltersFromUrl(searchParams, filters, prefix),
  );

  const availableFilters = filters.filter(
    (f) => !activeFilters.find((af) => af.key === f.key),
  );

  /**
   * Catch up with filters already in the URL when the page first mounts —
   * this covers navigating straight to a link with filters applied.
   */
  const hasSyncedFromUrl = useRef(false);

  useEffect(() => {
    if (!hasSyncedFromUrl.current) {
      const missing = readActiveFiltersFromUrl(
        searchParams,
        filters,
        prefix,
      ).filter(
        (candidate) => !activeFilters.find((af) => af.key === candidate.key),
      );

      if (missing.length > 0) {
        setActiveFilters((prev) => [...prev, ...missing]);
      }
    }

    hasSyncedFromUrl.current = true;
  }, [filters, prefix, searchParams, activeFilters]);

  const addFilter = (filter: Filter) => {
    setMenuOpen(false);
    setActiveFilters((prev) => [...prev, asActiveFilter(filter, true)]);
  };

  const removeFilter = useCallback((key: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const removeAllFilters = useCallback(() => setActiveFilters([]), []);

  const filterContextValue = useMemo(
    () => ({ removeFilter, removeAllFilters }),
    [removeAllFilters, removeFilter],
  );

  return (
    <DataTableFilterContext.Provider value={filterContextValue}>
      <div className="max-w-2/3 flex flex-wrap items-center gap-2">
        {activeFilters.map((filter) => {
          switch (filter.type) {
            case "select":
              return (
                <SelectFilter
                  key={filter.key}
                  filter={filter}
                  prefix={prefix}
                  readonly={Boolean(readonly)}
                  options={filter.options}
                  multiple={filter.multiple}
                  searchable={filter.searchable}
                  openOnMount={filter.openOnMount}
                />
              );
            case "date":
              return (
                <DateFilter
                  key={filter.key}
                  filter={filter}
                  prefix={prefix}
                  readonly={readonly}
                  openOnMount={filter.openOnMount}
                />
              );
            case "string":
              return (
                <StringFilter
                  key={filter.key}
                  filter={filter}
                  prefix={prefix}
                  readonly={readonly}
                  openOnMount={filter.openOnMount}
                />
              );
            case "number":
              return (
                <NumberFilter
                  key={filter.key}
                  filter={filter}
                  prefix={prefix}
                  readonly={readonly}
                  openOnMount={filter.openOnMount}
                />
              );
            default:
              return null;
          }
        })}
        {!readonly && (availableFilters.length > 0 || iconTrigger) && (
          <RadixPopover.Root modal open={menuOpen} onOpenChange={setMenuOpen}>
            <RadixPopover.Trigger asChild id="filters_menu_trigger">
              {iconTrigger ? (
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label={t("filters.addFilter")}
                  className={clx(
                    activeFilters.length > 0 &&
                      "bg-ui-bg-interactive text-ui-fg-on-color hover:bg-ui-bg-interactive-hover border-ui-border-interactive",
                  )}
                >
                  <Funnel />
                </IconButton>
              ) : (
                <Button size="small" variant="secondary">
                  {t("filters.addFilter")}
                </Button>
              )}
            </RadixPopover.Trigger>
            <RadixPopover.Portal>
              <RadixPopover.Content
                className={clx(
                  "bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-[1] h-full max-h-[200px] w-[300px] overflow-auto rounded-lg p-1 outline-none",
                )}
                data-name="filters_menu_content"
                align="start"
                sideOffset={8}
                collisionPadding={8}
                onCloseAutoFocus={(e) => {
                  const hasOpenFilter = activeFilters.some(
                    (filter) => filter.openOnMount,
                  );
                  if (hasOpenFilter) e.preventDefault();
                }}
              >
                {availableFilters.map((filter) => (
                  <div
                    className="bg-ui-bg-base hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-pressed text-ui-fg-base data-[disabled]:text-ui-fg-disabled txt-compact-small relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-none transition-colors data-[disabled]:pointer-events-none"
                    role="menuitem"
                    key={filter.key}
                    onClick={() => addFilter(filter)}
                  >
                    {filter.label}
                  </div>
                ))}
              </RadixPopover.Content>
            </RadixPopover.Portal>
          </RadixPopover.Root>
        )}
        {!readonly && activeFilters.length > 0 && (
          <ClearAllFilters filters={filters} prefix={prefix} />
        )}
      </div>
    </DataTableFilterContext.Provider>
  );
};

type ClearAllFiltersProps = {
  filters: Filter[];
  prefix?: string;
};

const ClearAllFilters = ({ filters, prefix }: ClearAllFiltersProps) => {
  const { removeAllFilters: clearAllFilters } = useDataTableFilterContext(),
    [, setSearchParams] = useSearchParams(),
    { t } = useTranslation();

  const handleRemoveAll = () => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      filters.forEach((filter) =>
        nextParams.delete(paramKeyFor(filter, prefix)),
      );
      return nextParams;
    });

    clearAllFilters();
  };

  return (
    <button
      type="button"
      onClick={handleRemoveAll}
      className={clx(
        "text-ui-fg-muted transition-fg txt-compact-small-plus rounded-md px-2 py-1",
        "hover:text-ui-fg-subtle",
        "focus-visible:shadow-borders-focus",
      )}
    >
      {t("filters.clearAll")}
    </button>
  );
};
