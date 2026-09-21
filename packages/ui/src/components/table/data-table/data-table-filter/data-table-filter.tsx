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
  renderItem?: () => React.ReactNode;
};

export type Filter = {
  key: string;
  label: string;
} & (
  | {
      type: "select";
      options: Option[];
      multiple?: boolean;
      searchable?: boolean;
    }
  | {
      type: "date";
      options?: never;
    }
  | {
      type: "string";
      options?: never;
    }
  | {
      type: "number";
      options?: never;
    }
);

type DataTableFilterProps = {
  filters: Filter[];
  readonly?: boolean;
  prefix?: string;
  /** Render the trigger as a compact icon button instead of a text button. */
  iconTrigger?: boolean;
};

export const DataTableFilter = ({
  filters,
  readonly,
  prefix,
  iconTrigger,
}: DataTableFilterProps) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const [activeFilters, setActiveFilters] = useState(
    getInitialFilters({ searchParams, filters, prefix }),
  );

  const availableFilters = filters.filter(
    (f) => !activeFilters.find((af) => af.key === f.key),
  );

  /**
   * If there are any filters in the URL that are not in the active filters,
   * add them to the active filters. This ensures that we display the filters
   * if a user navigates to a page with filters in the URL.
   */
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      const params = new URLSearchParams(searchParams);

      filters.forEach((filter) => {
        const key = prefix ? `${prefix}_${filter.key}` : filter.key;
        const value = params.get(key);
        if (value && !activeFilters.find((af) => af.key === filter.key)) {
          if (filter.type === "select") {
            setActiveFilters((prev) => [
              ...prev,
              {
                ...filter,
                multiple: filter.multiple,
                options: filter.options,
                openOnMount: false,
              },
            ]);
          } else {
            setActiveFilters((prev) => [
              ...prev,
              { ...filter, openOnMount: false },
            ]);
          }
        }
      });
    }

    initialMount.current = false;
  }, [activeFilters, filters, prefix, searchParams]);

  const addFilter = (filter: Filter) => {
    setOpen(false);
    setActiveFilters((prev) => [...prev, { ...filter, openOnMount: true }]);
  };

  const removeFilter = useCallback((key: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const removeAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  return (
    <DataTableFilterContext.Provider
      value={useMemo(
        () => ({
          removeFilter,
          removeAllFilters,
        }),
        [removeAllFilters, removeFilter],
      )}
    >
      <div className="max-w-2/3 flex flex-wrap items-center gap-2">
        {activeFilters.map((filter) => {
          /**
           * `activeFilters` holds a snapshot taken when the filter was
           * activated. That is fine for identity, but options can arrive AFTER
           * mount when they come from a network call (a countries list, a
           * chatbot list) — and a filter seeded from the URL is activated on the
           * very first render, while that list is still empty. Read the current
           * definition back off the `filters` prop so late options resolve;
           * otherwise the chip can never find its label and degrades to a bare
           * word with no popover trigger and no remove button, while the filter
           * stays applied to the query.
           */
          const live = filters.find((f) => f.key === filter.key);

          switch (filter.type) {
            case "select": {
              const liveSelect = live?.type === "select" ? live : undefined;
              return (
                <SelectFilter
                  key={filter.key}
                  filter={filter}
                  prefix={prefix}
                  readonly={readonly || false}
                  options={liveSelect?.options ?? filter.options}
                  multiple={liveSelect?.multiple ?? filter.multiple}
                  searchable={liveSelect?.searchable ?? filter.searchable}
                  openOnMount={filter.openOnMount}
                />
              );
            }
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
              break;
          }
        })}
        {!readonly && (availableFilters.length > 0 || iconTrigger) && (
          <RadixPopover.Root modal open={open} onOpenChange={setOpen}>
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
                  const hasOpenFilter = activeFilters.find(
                    (filter) => filter.openOnMount,
                  );

                  if (hasOpenFilter) {
                    e.preventDefault();
                  }
                }}
              >
                {availableFilters.map((filter) => {
                  return (
                    <div
                      className="bg-ui-bg-base hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-pressed text-ui-fg-base data-[disabled]:text-ui-fg-disabled txt-compact-small relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-none transition-colors data-[disabled]:pointer-events-none"
                      role="menuitem"
                      key={filter.key}
                      onClick={() => {
                        addFilter(filter);
                      }}
                    >
                      {filter.label}
                    </div>
                  );
                })}
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
  const { removeAllFilters } = useDataTableFilterContext();
  const [, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const handleRemoveAll = () => {
    setSearchParams((prev) => {
      const newValues = new URLSearchParams(prev);

      filters.forEach((filter) => {
        newValues.delete(prefix ? `${prefix}_${filter.key}` : filter.key);
      });

      // Same reset useSelectedParams does when a single filter changes: the
      // cleared list is a different length, so the page you were on may no
      // longer exist. Without this, clearing from page 3 lands on an empty one.
      newValues.delete(prefix ? `${prefix}_page` : "page");
      newValues.delete(prefix ? `${prefix}_offset` : "offset");

      return newValues;
    });

    removeAllFilters();
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

const getInitialFilters = ({
  searchParams,
  filters,
  prefix,
}: {
  searchParams: URLSearchParams;
  filters: Filter[];
  prefix?: string;
}) => {
  const params = new URLSearchParams(searchParams);
  const activeFilters: (Filter & { openOnMount: boolean })[] = [];

  filters.forEach((filter) => {
    const key = prefix ? `${prefix}_${filter.key}` : filter.key;
    const value = params.get(key);
    if (value) {
      if (filter.type === "select") {
        activeFilters.push({
          ...filter,
          multiple: filter.multiple,
          options: filter.options,
          openOnMount: false,
        });
      } else {
        activeFilters.push({ ...filter, openOnMount: false });
      }
    }
  });

  return activeFilters;
};
