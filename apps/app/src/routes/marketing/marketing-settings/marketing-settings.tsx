import { RouteDrawer } from "@/components/modals";
import { useMarketingSettings } from "@/hooks/api/marketing-settings";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Heading } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { SettingsForm } from "./settings-form";

/** Cài đặt gửi tin: the rules every send and auto-send follows. */
export const MarketingSettings = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const { settings, isLoading, isError, error } =
    useMarketingSettings(workspaceSlug);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("marketing.settings.title")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {isLoading || !settings ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        <SettingsForm settings={settings} />
      )}
    </RouteDrawer>
  );
};
