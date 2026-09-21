import { DescendingSorting } from "@medusajs/icons";
import { DropdownMenu, IconButton } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export type DataTableOrderByKey<TData> = {
  key: keyof TData;
  label: string;
};

type DataTableOrderByProps<TData> = {
  keys: DataTableOrderByKey<TData>[];
  prefix?: string;
};

// const object + union instead of a TS enum: this package ships TypeScript
// source to its consumers, and the apps compile with `erasableSyntaxOnly`,
// which disallows enums.
const SortDirection = {
  ASC: "asc",
  DESC: "desc",
} as const;
type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

type SortState = {
  key?: string;
  dir: SortDirection;
};

const initState = (params: URLSearchParams, prefix?: string): SortState => {
  const param = prefix ? `${prefix}_order` : "order";
  const sortParam = params.get(param);

  if (!sortParam) {
    return {
      dir: SortDirection.ASC,
    };
  }

  const dir = sortParam.startsWith("-")
    ? SortDirection.DESC
    : SortDirection.ASC;
  const key = sortParam.startsWith("-") ? sortParam.slice(1) : sortParam;

  return {
    key,
    dir,
  };
};

export const DataTableOrderBy = <TData,>({
  keys,
  prefix,
}: DataTableOrderByProps<TData>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<{
    key?: string;
    dir: SortDirection;
  }>(initState(searchParams, prefix));
  const param = prefix ? `${prefix}_order` : "order";
  const pageKey = prefix ? `${prefix}_page` : "page";
  const offsetKey = prefix ? `${prefix}_offset` : "offset";
  const { t } = useTranslation();

  const handleDirChange = (dir: string) => {
    // Read the latest state via the functional updater so a quick key→direction
    // gesture doesn't compute both writes from the same stale render snapshot.
    setState((prev) => {
      // Until a column is picked, `key` is undefined — and `updateOrderParam`
      // treats that as "clear the sort", so choosing only a direction used to
      // delete the param and change nothing. That is the obvious gesture when
      // there is a single sortable column, which is most of these tables, so
      // fall back to the first one.
      const firstKey = keys[0];
      const key = prev.key ?? (firstKey ? String(firstKey.key) : undefined);
      const next = { key, dir: dir as SortDirection };
      updateOrderParam(next);
      return next;
    });
  };

  const handleKeyChange = (value: string) => {
    setState((prev) => {
      const next = { ...prev, key: value };
      updateOrderParam(next);
      return next;
    });
  };

  const updateOrderParam = (state: SortState) => {
    if (!state.key) {
      setSearchParams((prev) => {
        prev.delete(param);
        prev.delete(pageKey);
        prev.delete(offsetKey);
        return prev;
      });

      return;
    }

    const orderParam =
      state.dir === SortDirection.ASC ? state.key : `-${state.key}`;
    setSearchParams((prev) => {
      prev.set(param, orderParam);
      // Same reset every other URL-writing control does (useSelectedParams,
      // ClearAllFilters): the re-sorted result may not have a page this deep,
      // so land back on page 1 instead of leaving the user on a stale page.
      prev.delete(pageKey);
      prev.delete(offsetKey);
      return prev;
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        {/* Icon-only, so without a label a screen reader announces just
            "button" and the control cannot be reached by name. */}
        <IconButton size="small" aria-label={t("general.orderBy")}>
          <DescendingSorting />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="z-[1]" align="end">
        <DropdownMenu.RadioGroup
          value={state.key}
          onValueChange={handleKeyChange}
        >
          {keys.map((key) => {
            const stringKey = String(key.key);

            return (
              <DropdownMenu.RadioItem
                key={stringKey}
                value={stringKey}
                onSelect={(event) => event.preventDefault()}
              >
                {key.label}
              </DropdownMenu.RadioItem>
            );
          })}
        </DropdownMenu.RadioGroup>
        <DropdownMenu.Separator />
        <DropdownMenu.RadioGroup
          value={state.dir}
          onValueChange={handleDirChange}
        >
          <DropdownMenu.RadioItem
            className="flex items-center justify-between"
            value="asc"
            onSelect={(event) => event.preventDefault()}
          >
            {t("general.ascending")}
            <DropdownMenu.Label>1 - 30</DropdownMenu.Label>
          </DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem
            className="flex items-center justify-between"
            value="desc"
            onSelect={(event) => event.preventDefault()}
          >
            {t("general.descending")}
            <DropdownMenu.Label>30 - 1</DropdownMenu.Label>
          </DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
