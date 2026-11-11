import { channelOf } from "@/components/platform-icon/channel-catalog";
import {
  useDeleteTrackedLink,
  useTrackedLink,
  useUpdateTrackedLink,
} from "@/hooks/api/tracked-links";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { ROUTES } from "@/routes/constants";
import {
  PauseSolid,
  PencilSquare,
  PlaySolid,
  Share,
  Trash,
} from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { ActionMenu, TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { TwoColumnPage } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SourceLinkField } from "../components/source-link-field";
import { SourceLinksSection } from "../components/source-links-section";
import { SourceSettingsSection } from "../components/source-settings-section";
import { SourceStatsSection } from "../components/source-stats-section";
import { SOURCE_STATUS_COLOR } from "../constants";

export function SourceDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const { getFullDate } = useDate();
  const { workspaceSlug } = useWorkspaceParams();
  const { sourceId = "" } = useParams<{ sourceId: string }>();

  const { link, isLoading, isError, error } = useTrackedLink(
    workspaceSlug,
    sourceId,
  );

  const { mutateAsync: update } = useUpdateTrackedLink(workspaceSlug, sourceId);
  const { mutateAsync: remove } = useDeleteTrackedLink(workspaceSlug);

  if (isError) {
    throw error;
  }

  if (isLoading || !link) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={1} />;
  }

  const stopped = link.status === "STOPPED";

  const toggleStatus = async () => {
    try {
      await update({ status: stopped ? "ACTIVE" : "STOPPED" });
      toast.success(
        t(
          stopped
            ? "customerSources.detail.resumed"
            : "customerSources.detail.stopped",
        ),
      );
    } catch (e) {
      toast.error(readApiError(e).message ?? t("customerSources.error"));
    }
  };

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("customerSources.delete.title", { name: link.name }),
      description: t("customerSources.delete.description"),
      variant: "danger",
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await remove(link.id);
      toast.success(t("customerSources.delete.deleted"));
      navigate(`/${workspaceSlug}/${ROUTES.CustomerSources}`, {
        replace: true,
      });
    } catch (e) {
      toast.error(readApiError(e).message ?? t("customerSources.error"));
    }
  };

  return (
    <div className="flex w-full flex-col gap-y-3">
      <Container className="p-0">
        <div className="flex flex-col gap-y-3 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Heading level="h1" className="min-w-0 break-words">
                  {link.name}
                </Heading>
                <StatusBadge
                  color={SOURCE_STATUS_COLOR[link.status]}
                  className="whitespace-nowrap"
                >
                  {t(`customerSources.status.${link.status}`)}
                </StatusBadge>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {t("customerSources.detail.summary", {
                  kind: t(`customerSources.kind.${link.kind}`),
                  channel: channelOf(link.account.type).label,
                  date: getFullDate(new Date(link.createdAt)),
                })}
              </Text>
            </div>
            <div className="flex items-center gap-x-2">
              {link.url && (
                <Button size="small" variant="secondary" asChild>
                  <Link to="share">
                    <Share />
                    {t("customerSources.share.action")}
                  </Link>
                </Button>
              )}
              <Button size="small" variant="secondary" asChild>
                <Link to="edit">
                  <PencilSquare />
                  {t("actions.edit")}
                </Link>
              </Button>
              <ActionMenu
                groups={[
                  {
                    actions: [
                      {
                        icon: stopped ? <PlaySolid /> : <PauseSolid />,
                        label: t(
                          stopped
                            ? "customerSources.detail.resume"
                            : "customerSources.detail.stop",
                        ),
                        onClick: toggleStatus,
                      },
                    ],
                  },
                  {
                    actions: [
                      {
                        icon: <Trash />,
                        label: t("actions.delete"),
                        onClick: handleDelete,
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>
          <div className="max-w-[480px]">
            <SourceLinkField url={link.url} channel={link.account.type} />
          </div>
        </div>
        <SourceStatsSection source={link} />
      </Container>

      <TwoColumnPage hasOutlet>
        <TwoColumnPage.Main>
          <SourceLinksSection source={link} />
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <SourceSettingsSection source={link} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  );
}
