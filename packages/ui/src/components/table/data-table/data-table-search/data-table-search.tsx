import { Input } from "@medusajs/ui";
import { type ChangeEvent, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useDebounceCallback } from "usehooks-ts";
import { useSelectedParams } from "../hooks";

type DataTableSearchProps = {
  placeholder?: string;
  prefix?: string;
  autofocus?: boolean;
};

export const DataTableSearch = ({
  placeholder,
  prefix,
  autofocus,
}: DataTableSearchProps) => {
  const { t } = useTranslation();
  const placeholderText = placeholder || t("general.search");
  const selectedParams = useSelectedParams({
    param: "search",
    prefix,
    multiple: false,
  });

  const query = selectedParams.get();

  const debouncedOnChange = useDebounceCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (!value) {
        selectedParams.delete();
      } else {
        selectedParams.add(value);
      }
    },
    500,
  );

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <Input
      autoComplete="off"
      name="q"
      type="search"
      size="small"
      autoFocus={autofocus}
      defaultValue={query?.[0] || undefined}
      onChange={debouncedOnChange}
      placeholder={placeholderText}
    />
  );
};
