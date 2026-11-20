import { Badge, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = { count?: number };

/** How many agents have the tool turned on. */
export const ToolInUseCell: FC<Props> = ({ count }) => {
  const { t } = useTranslation();

  if (count === undefined) return null;

  return count > 0 ? (
    <Badge size="2xsmall" color="grey">
      {t("tools.list.usedBy", { count })}
    </Badge>
  ) : (
    <Text size="xsmall" className="text-ui-fg-muted">
      {t("tools.list.notUsed")}
    </Text>
  );
};
