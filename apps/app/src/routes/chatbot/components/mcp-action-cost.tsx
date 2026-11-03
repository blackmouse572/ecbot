import { Alert, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { MCP_HEAVY_PROMPT_TOKENS } from "../constants";

type McpActionCostProps = { tokens: number };

/** How many tokens the enabled actions add to every message, with a warning when it is a lot. */
export const McpActionCost: FC<McpActionCostProps> = ({ tokens }) => {
  const { t, i18n } = useTranslation();
  const count = tokens.toLocaleString(i18n.language);

  if (tokens > MCP_HEAVY_PROMPT_TOKENS) {
    return (
      <Alert variant="warning">{t("tools.actionCost.heavy", { count })}</Alert>
    );
  }

  return (
    <Text size="small" className="text-ui-fg-subtle">
      {t("tools.actionCost.normal", { count })}
    </Text>
  );
};
