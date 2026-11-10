import { RouteFocusModal } from "@/components/modals";
import { useTrackedLink } from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { SourceShareStep } from "../components/source-share-step";

/** The share step again, opened from a source's Chia sẻ button. */
export const SourceShare = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { sourceId = "" } = useParams<{ sourceId: string }>();

  const { link, isLoading, isError, error } = useTrackedLink(
    workspaceSlug,
    sourceId,
  );

  if (isError) {
    throw error;
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Header>
        <RouteFocusModal.Title asChild>
          <span className="sr-only">{t("customerSources.share.title")}</span>
        </RouteFocusModal.Title>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-10">
        {isLoading || !link ? (
          <div className="w-full max-w-[720px]">
            <FormSkeleton label={t("general.loading")} />
          </div>
        ) : (
          <SourceShareStep link={link} />
        )}
      </RouteFocusModal.Body>
      <RouteFocusModal.Footer>
        <div className="flex w-full items-center justify-end">
          <RouteFocusModal.Close asChild>
            <Button size="small" type="button">
              {t("customerSources.share.done")}
            </Button>
          </RouteFocusModal.Close>
        </div>
      </RouteFocusModal.Footer>
    </RouteFocusModal>
  );
};
