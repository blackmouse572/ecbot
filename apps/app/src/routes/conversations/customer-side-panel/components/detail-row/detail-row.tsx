import { Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  label: ReactNode;
  value: string | null | undefined;
}

// One read-only customer detail: the label on the left, the value beside it.
export const DetailRow: FC<Props> = ({ label, value }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3">
      <Text size="xsmall" className="text-ui-fg-subtle break-words">
        {label}
      </Text>
      {value ? (
        <Text size="small" className="whitespace-pre-line break-words">
          {value}
        </Text>
      ) : (
        <Text size="small" className="text-ui-fg-muted">
          {t("general.notSet")}
        </Text>
      )}
    </div>
  );
};
