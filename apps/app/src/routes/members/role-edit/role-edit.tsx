import { RouteDrawer } from "@/components/modals";
import { useWorkspaceRole } from "@/hooks/api/workspace-roles";
import { Heading } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { RoleEditForm } from "./components/role-edit-form";

export const RoleEdit = () => {
  const { t } = useTranslation();
  const { state } = useLocation();
  const { id } = useParams<{ id: string }>();
  const { role, isLoading, isError, error } = useWorkspaceRole(id!);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer prev={state?.prev}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("roles.edit.title")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("roles.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isLoading || !role ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        <RoleEditForm role={role} />
      )}
    </RouteDrawer>
  );
};

export const Component = RoleEdit;
