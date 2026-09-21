import { Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

export function MarketplaceHeader() {
  const { t } = useTranslation();
  return (
    <div className="border-b px-6 py-4">
      <Heading level="h2">{t("tools.marketplace.title")}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {t("tools.marketplace.browse")}
      </Text>
    </div>
  );
}
