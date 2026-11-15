import {
  useCustomer,
  useCustomers,
  type CustomerGetResponseDto,
} from "@/hooks/api/customers";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounceValue } from "usehooks-ts";
import { ORDER_CONSTANTS } from "../constants";

type Customer = Pick<CustomerGetResponseDto, "id" | "name" | "phone">;

type CustomerComboboxProps = Omit<
  ComponentProps<typeof ComboboxInput>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (customerId: string) => void;
};

const label = (customer: Customer) =>
  [customer.name, customer.phone].filter(Boolean).join(" · ");

/** Finds a customer by name or phone on the server, as the Khách field of frame 14c. */
export function CustomerCombobox({
  value,
  onChange,
  name,
  ...inputProps
}: CustomerComboboxProps) {
  const { t } = useTranslation();
  // What the person typed; null shows the picked customer.
  const [query, setQuery] = useState<string | null>(null);

  const [search] = useDebounceValue(
    query?.trim() ?? "",
    ORDER_CONSTANTS.CUSTOMER_SEARCH_DEBOUNCE_MS,
  );

  const { customers, isLoading } = useCustomers({
    perPage: 20,
    search: search || undefined,
  });

  // Kept apart from the results, which change with every search.
  const [picked, setPicked] = useState<Customer | null>(null);

  // A customer given up front (?customer=) is read once to show its name.
  const { customer: preset } = useCustomer(
    value && picked?.id !== value ? value : null,
  );

  const selected =
    picked?.id === value ? picked : preset?.id === value ? preset : null;

  return (
    <Combobox<Customer>
      items={customers}
      value={selected}
      onValueChange={(customer) => {
        if (!customer) return;
        setPicked(customer);
        onChange(customer.id);
      }}
      inputValue={query ?? (selected ? label(selected) : "")}
      onInputValueChange={setQuery}
      onOpenChange={(open) => !open && setQuery(null)}
      itemToStringLabel={label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      // The server already searched.
      filter={null}
      autoHighlight
      name={name}
    >
      <ComboboxInput
        placeholder={t("orders.form.customerPlaceholder")}
        triggerLabel={t("orders.form.customer")}
        {...inputProps}
        onBlur={(event) => {
          setQuery(null);
          inputProps.onBlur?.(event);
        }}
      />
      <ComboboxContent>
        {isLoading ? (
          <div className="txt-compact-small text-ui-fg-muted px-3 py-2">
            {t("general.loading")}
          </div>
        ) : (
          <ComboboxEmpty>{t("orders.form.customerEmpty")}</ComboboxEmpty>
        )}
        <ComboboxList>
          {(customer: Customer) => (
            <ComboboxItem key={customer.id} value={customer}>
              <span className="truncate">
                {customer.name || t("orders.noName")}
              </span>
              {customer.phone && (
                <span className="text-ui-fg-muted tabular-nums">
                  {customer.phone}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
