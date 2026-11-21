import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { DetailRow } from "../detail-row";

interface Props {
  fields: Record<string, string> | null | undefined;
}

// Details the agent saved with set_customer_field (the delivery address, or
// what the owner asked it to collect), shown read-only among the customer's
// fields. Keys are the agent's own slugs.
export const SavedFieldsSection: FC<Props> = ({ fields }) => {
  const { t } = useTranslation();
  const entries = Object.entries(fields ?? {}).filter(([, value]) => value);
  if (!entries.length) return null;

  const label = (key: string) =>
    key === "address"
      ? t("conversations.customer.panel.savedFields.address")
      : key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <>
      {entries.map(([key, value]) => (
        <DetailRow key={key} label={label(key)} value={value} />
      ))}
    </>
  );
};
