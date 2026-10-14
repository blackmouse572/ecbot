import { Button } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type ChatbotSectionEditButtonProps = {
  /** The card's edit route, relative to the chatbot page. */
  to: string;
  label?: string;
};

/** A card's Edit: a visible text button that opens that card's drawer. */
export const ChatbotSectionEditButton: FC<ChatbotSectionEditButtonProps> = ({
  to,
  label,
}) => {
  const { t } = useTranslation();

  return (
    <Button size="small" variant="secondary" asChild>
      <Link to={to}>{label ?? t("actions.edit")}</Link>
    </Button>
  );
};
