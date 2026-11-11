import type { ProductGroupGetResponseDto } from "@/hooks/api/product-groups";
import { PlusMini } from "@medusajs/icons";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OrderItemFormData } from "../schemas";

type GroupChoice = NonNullable<OrderItemFormData["group"]>;

type ProductGroupComboboxProps = Omit<
  ComponentProps<typeof ComboboxInput>,
  "value" | "onChange"
> & {
  groups: ProductGroupGetResponseDto[];
  value: OrderItemFormData["group"];
  onChange: (group: OrderItemFormData["group"]) => void;
};

const key = (name: string) => name.trim().toLocaleLowerCase("vi");

/**
 * Picks a product group, or names a new one: "Chưa có nhóm phù hợp thì gõ tên
 * để tạo mới" (frame 14c). A new name has no id until the order is saved.
 */
export function ProductGroupCombobox({
  groups,
  value,
  onChange,
  name,
  ...inputProps
}: ProductGroupComboboxProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState<string | null>(null);
  const typed = query?.trim() ?? "";

  const existing: GroupChoice[] = groups.map(({ id, name }) => ({ id, name }));

  const matches = existing.filter((group) =>
    key(group.name).includes(key(typed)),
  );

  const isNew =
    !!typed && !existing.some((group) => key(group.name) === key(typed));

  const items: GroupChoice[] = isNew ? [...matches, { name: typed }] : matches;

  return (
    <Combobox<GroupChoice>
      items={items}
      value={value}
      onValueChange={(group) => onChange(group ?? null)}
      inputValue={query ?? value?.name ?? ""}
      onInputValueChange={setQuery}
      onOpenChange={(open) => !open && setQuery(null)}
      itemToStringLabel={(group) => group.name}
      isItemEqualToValue={(a, b) =>
        a.id ? a.id === b.id : !b.id && key(a.name) === key(b.name)
      }
      // Filtered above, so the "create" item always shows.
      filter={null}
      autoHighlight
      name={name}
    >
      <ComboboxInput
        placeholder={t("orders.form.groupPlaceholder")}
        triggerLabel={t("orders.form.group")}
        {...inputProps}
        onBlur={(event) => {
          // Emptying the field takes the item out of its group.
          if (query !== null && !typed) onChange(null);
          setQuery(null);
          inputProps.onBlur?.(event);
        }}
      />
      <ComboboxContent className="pointer-events-auto min-w-56">
        <ComboboxList>
          {(group: GroupChoice) => (
            <ComboboxItem key={group.id ?? `new:${group.name}`} value={group}>
              {group.id ? (
                group.name
              ) : (
                <span className="text-ui-fg-interactive flex items-center gap-x-1.5">
                  <PlusMini />
                  {t("orders.form.groupCreate", { name: group.name })}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
