import { CheckCircleMiniSolid } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export const JoinSuccessTab = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center p-16 h-full">
      <div className="flex w-full max-w-[720px] h-full flex-col gap-y-8 items-center justify-center">
        <CheckCircleMiniSolid className="mx-auto text-ui-tag-green-icon" />
        <div className="space-y-2">
          <Text
            size="xlarge"
            leading="compact"
            weight="plus"
            className="text-center"
          >
            {t("join.success.title")}
          </Text>
          <Text
            size="xlarge"
            className="text-ui-fg-muted text-balance text-center"
          >
            {t("join.success.description")}
          </Text>
        </div>
        <Button asChild>
          <Link to="/">{t("actions.continued")}</Link>
        </Button>
      </div>
    </div>
  );
};
