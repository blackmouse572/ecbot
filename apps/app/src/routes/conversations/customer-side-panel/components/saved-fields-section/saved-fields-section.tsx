import { Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  fields: Record<string, string> | null | undefined;
}

// Details the agent saved with set_customer_field (the delivery address, or
// what the owner asked it to collect). Keys are the agent's own slugs.
export const SavedFieldsSection: FC<Props> = ({ fields }) => {
  const { t } = useTranslation();
  const entries = Object.entries(fields ?? {}).filter(([, value]) => value);
  if (!entries.length) return null;

  const label = (key: string) =>
    key === "address"
      ? t("conversations.customer.panel.savedFields.address")
      : key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="border-ui-border-base border-t px-4 py-4">
      <Heading level="h3" className="mb-1">
        {t("conversations.customer.panel.savedFields.title")}
      </Heading>
      <Text size="small" className="text-ui-fg-subtle mb-3">
        {t("conversations.customer.panel.savedFields.hint")}
      </Text>
      <dl className="flex flex-col gap-y-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3"
          >
            <Text
              as="dt"
              size="small"
              className="text-ui-fg-subtle break-words"
            >
              {label(key)}
            </Text>
            <Text as="dd" size="small" className="text-ui-fg-base break-words">
              {value}
            </Text>
          </div>
        ))}
      </dl>
    </div>
  );
};
