import { PlatformIcon } from "@/components/platform-icon/platform-icon";
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
import { PauseSolid, PencilSquare, PlaySolid, Trash } from "@medusajs/icons";
import {
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import {
  ActionMenu,
  Section,
  SectionRow,
  SingleColumnPageSkeleton,
} from "@repo/ui/common-components";
import { SingleColumnPage } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { SourceLinkField } from "../components/source-link-field";
import { SourceLinksSection } from "../components/source-links-section";
import { SourceQr } from "../components/source-qr";
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
    return <SingleColumnPageSkeleton sections={3} showJSON={false} />;
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
    <SingleColumnPage>
      <div className="flex flex-col gap-y-3">
        <Container className="divide-y p-0">
          <div className="flex items-start justify-between gap-x-3 px-6 py-4">
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
                {t(`customerSources.kind.${link.kind}`)} ·{" "}
                {channelOf(link.account.type).label}
              </Text>
            </div>
            <ActionMenu
              groups={[
                {
                  actions: [
                    {
                      icon: <PencilSquare />,
                      label: t("actions.edit"),
                      onClick: () => navigate("edit"),
                    },
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
          <div className="flex flex-col gap-y-4 px-6 py-4">
            <SourceLinkField url={link.url} />
            {link.url && (
              <SourceQr url={link.url} code={link.code} name={link.name} />
            )}
          </div>
        </Container>

        <SourceLinksSection source={link} />

        <Container className="p-0">
          <div className="px-6 py-4">
            <Heading level="h2">{t("customerSources.detail.settings")}</Heading>
          </div>
          <Section variant="spaced">
            <SectionRow
              title={t("customerSources.detail.channel")}
              value={
                <span className="flex min-w-0 items-center gap-x-2">
                  <PlatformIcon type={link.account.type} aria-hidden />
                  <span className="truncate">{link.account.name}</span>
                </span>
              }
            />
            <SectionRow
              title={t("customerSources.detail.code")}
              value={<span className="font-mono">{link.code}</span>}
            />
            {link.targetUrl && (
              <SectionRow
                title={t("customerSources.detail.targetUrl")}
                value={link.targetUrl}
              />
            )}
            <SectionRow
              title={t("customerSources.detail.createdAt")}
              value={getFullDate(new Date(link.createdAt))}
            />
          </Section>
        </Container>
      </div>
    </SingleColumnPage>
  );
}
