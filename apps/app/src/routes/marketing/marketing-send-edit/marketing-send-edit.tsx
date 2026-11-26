import { RouteDrawer } from "@/components/modals";
import { useMarketingSend } from "@/hooks/api/marketing-sends";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Heading } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { SendEditForm } from "./send-edit-form";

/** Sửa tin nhắn: a send's name and the text still to go out. */
export const MarketingSendEdit = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { sendId = "" } = useParams<{ sendId: string }>();

  const { send, isLoading, isError, error } = useMarketingSend(
    workspaceSlug,
    sendId,
  );

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("marketing.sends.edit.title")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("marketing.sends.edit.title")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isLoading || !send ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        <SendEditForm send={send} />
      )}
    </RouteDrawer>
  );
};
