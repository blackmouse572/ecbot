import { useRouteModal } from "@/components/modals";
import { useCreateWorkspaceRole } from "@/hooks/api/workspace-roles";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@medusajs/ui";
import type { RoleCreateWorkspaceRequestDto } from "@repo/client";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROLE_FORM_DEFAULTS } from "../../constants";
import { createRoleSchema, type RoleFormData } from "../../schemas";
import { RoleForm } from "../role-form/role-form";

export function RoleCreateForm() {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: createRole, isPending } = useCreateWorkspaceRole();
  const navigate = useNavigate();

  const form = useForm<RoleFormData>({
    resolver: zodResolver(createRoleSchema(t)),
    defaultValues: ROLE_FORM_DEFAULTS,
  });

  const handleSubmit = async (data: RoleFormData) => {
    const roleData: RoleCreateWorkspaceRequestDto = {
      name: data.name,
      description: data.description || "",
      permissions: data.permissions,
    };

    toast.promise(
      createRole(roleData).then((v) => {
        handleSuccess();
        return v;
      }),
      {
        success: t("roles.create.success", "Role created successfully"),
        error: t("roles.create.error", "Failed to create role"),
        loading: t("roles.create.loading", "Creating role..."),
      },
    );
  };

  const handleCancel = () => {
    navigate(`/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceRoles}`);
  };

  return (
    <RoleForm
      form={form}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isPending={isPending}
      title={t("roles.create.title", "Create Role")}
      submitText={t("actions.create", "Create")}
      cancelText={t("actions.cancel", "Cancel")}
    />
  );
}
