import { CheckCircleSolid } from "@medusajs/icons";
import { Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

export const SuccessStep = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-y-4 p-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ui-tag-green-bg text-ui-tag-green-icon text-2xl">
        <CheckCircleSolid />
      </div>
      <Heading level="h2">{t("tools.new.success.title")}</Heading>
      <Text size="small" className="text-ui-fg-subtle text-center max-w-sm">
        {t("tools.new.success.description")}
      </Text>
    </div>
  );
};
