import { useCustomerTagList } from "@/hooks/api/customer-tags";
import { Combobox } from "@repo/ui/common-components";
import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

type SourceTagsFieldProps = {
  value: string[];
  onChange: (tagIds: string[]) => void;
};

/** Picks the customer tags a source puts on everyone who comes through it. */
export const SourceTagsField = forwardRef<
  HTMLInputElement,
  SourceTagsFieldProps
>(({ value, onChange }, ref) => {
  const { t } = useTranslation();
  const { tags, isLoading } = useCustomerTagList();

  const options = useMemo(
    () =>
      tags.map((tag) => ({
        value: tag.id,
        label: tag.emoji ? `${tag.emoji} ${tag.name}` : tag.name,
      })),
    [tags],
  );

  return (
    <Combobox<string[]>
      ref={ref}
      value={value}
      onChange={(next) => onChange(next ?? [])}
      options={options}
      isFetchingNextPage={isLoading}
      placeholder={t("customerSources.form.tagsPlaceholder")}
      noResultsPlaceholder={t("customerSources.form.noTags")}
    />
  );
});

SourceTagsField.displayName = "SourceTagsField";
