import { RouteDrawer } from "@/components/modals";
import { useWorkspace } from "@/hooks/api/workspace";
import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { WorkspaceEditForm } from "./components/workspace-edit-form";

export const WorkspaceEdit = () => {
  const { t } = useTranslation();
  const { state } = useLocation();
  const { workspace, isLoading, isError, error } = useWorkspace();

  if (isLoading) {
    return null;
  }

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer prev={state?.prev}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("workspace.edit.title")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("workspace.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <WorkspaceEditForm workspace={workspace!} />
    </RouteDrawer>
  );
};

export const Component = WorkspaceEdit;
