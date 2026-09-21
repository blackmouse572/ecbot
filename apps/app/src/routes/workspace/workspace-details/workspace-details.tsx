import { DateCell } from "@/components/table/table-cells/common/date-cell";
import {
  useDeleteWorkspace,
  useWorkspace,
  workspaceQueryKeys,
} from "@/hooks/api/workspace";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { PencilSquare, Trash } from "@medusajs/icons";
import {
  Avatar,
  Badge,
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { TwoColumnPage } from "@repo/ui/layout";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

export const WorkspaceDetails = () => {
  const { t } = useTranslation();
  const { workspace, isLoading, isError, error } = useWorkspace();
  const { workspaceSlug } = useWorkspaceParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialog = usePrompt();
  const deleteWorkspace = useDeleteWorkspace();

  const handleDelete = async () => {
    if (!workspace) return;

    const confirmed = await dialog({
      title: t("workspace.delete.confirm.title"),
      description: t("workspace.delete.confirm.description"),
      verificationText: workspace.slug,
      confirmText: t("workspace.delete.confirm.confirm"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await deleteWorkspace.mutateAsync();
      // Settle the list before navigating so the post-delete redirect never
      // sees the workspace we just removed.
      await queryClient.refetchQueries({ queryKey: workspaceQueryKeys.list() });
      toast.success(t("workspace.delete.success"));
      navigate("/");
    } catch (e) {
      console.error("Failed to delete workspace:", e);
      toast.error(t("workspace.delete.error"));
    }
  };

  if (isLoading) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={1} />;
  }

  if (isError) {
    throw error;
  }

  if (!workspace) {
    return (
      <Container className="flex items-center justify-center h-64">
        <Text>{t("workspace.error.notFound")}</Text>
      </Container>
    );
  }

  return (
    <TwoColumnPage hasOutlet>
      <TwoColumnPage.Main>
        <Container className="flex flex-col gap-y-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-x-4">
              <Avatar
                src={workspace.avatar}
                fallback={workspace.name.charAt(0).toUpperCase()}
                size="xlarge"
              />
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center gap-x-2">
                  <Heading level="h1" className="text-2xl font-bold">
                    {workspace.name}
                  </Heading>
                </div>
                <Badge size="small">/{workspace.slug}</Badge>
              </div>
            </div>

            <Button asChild variant="secondary" size="small">
              <Link
                to={`/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.Workspace}/edit`}
              >
                <PencilSquare className="w-4 h-4" />
                {t("actions.edit")}
              </Link>
            </Button>
          </div>

          <div className="space-y-4 cursor-default">
            <div>
              <Text size="small" className="text-ui-fg-muted font-medium">
                {t("fields.name")}
              </Text>
              <Text className="text-ui-fg-base">{workspace.name}</Text>
            </div>

            <div>
              <Text size="small" className="text-ui-fg-muted font-medium">
                {t("fields.slug")}
              </Text>
              <Text className="text-ui-fg-base">{workspace.slug}</Text>
            </div>

            <div>
              <Text size="small" className="text-ui-fg-muted font-medium">
                {t("fields.createdAt")}
              </Text>
              <Text className="text-ui-fg-base">
                <DateCell date={workspace.createdAt} />
              </Text>
            </div>
          </div>
        </Container>

        <Container className="flex flex-col gap-y-4 border-rose-500/40 border">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2" className="text-ui-fg-base">
              {t("workspace.delete.dangerZone.title")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("workspace.delete.dangerZone.description")}
            </Text>
          </div>
          <div>
            <Button
              variant="danger"
              size="small"
              onClick={handleDelete}
              isLoading={deleteWorkspace.isPending}
            >
              <Trash className="w-4 h-4" />
              {t("workspace.delete.dangerZone.action")}
            </Button>
          </div>
        </Container>
      </TwoColumnPage.Main>

      <TwoColumnPage.Sidebar>
        <Container className="p-6">
          <div className="space-y-4">
            <div>
              <Text size="small" className="text-ui-fg-muted font-medium">
                {t("workspace.fields.avatar")}
              </Text>
              <div className="flex items-center gap-x-2 mt-2">
                <Avatar
                  src={workspace.avatar}
                  fallback={workspace.name.charAt(0).toUpperCase()}
                  className="size-8"
                />
                <Text className="text-ui-fg-base text-sm">
                  {workspace.avatar
                    ? t("workspace.avatar.custom")
                    : t("workspace.avatar.default")}
                </Text>
              </div>
            </div>
          </div>
        </Container>
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  );
};

export const Component = WorkspaceDetails;
