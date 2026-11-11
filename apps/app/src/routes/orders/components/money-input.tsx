import { Input } from "@medusajs/ui";
import { type ComponentProps, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { formatAmountInput, parseAmountInput } from "../utils";

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

/** A whole amount in đồng, grouped as it is typed ("345.000"). */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const { i18n } = useTranslation();

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        className={className}
        value={formatAmountInput(value, i18n.language)}
        onChange={(event) => onChange(parseAmountInput(event.target.value))}
        {...props}
      />
    );
  },
);

MoneyInput.displayName = "MoneyInput";
