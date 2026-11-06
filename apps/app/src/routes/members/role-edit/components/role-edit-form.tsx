import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useUpdateWorkspaceRole } from "@/hooks/api/workspace-roles";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Textarea, toast } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PermissionsField } from "../../role-create/components";
import { createRoleSchema, type RoleFormData } from "../../role-create/schemas";

type RoleEditFormProps = { role: RoleGetResponseDto };

/** Description and permissions of a custom role. The API keeps the name fixed. */
export const RoleEditForm: FC<RoleEditFormProps> = ({ role }) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { mutateAsync, isPending } = useUpdateWorkspaceRole(role.id);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(createRoleSchema(t)),
    defaultValues: {
      name: role.name,
      description: role.description ?? "",
      // SAFETY: the API only stores subjects from ALLOWED_WORKSPACE_POLICY_SUBJECT,
      // which the form schema mirrors, so every stored permission fits it.
      permissions: role.permissions as RoleFormData["permissions"],
    },
  });

  const handleSubmit = form.handleSubmit(
    async ({ description, permissions }) => {
      try {
        await mutateAsync({ description: description ?? "", permissions });
        toast.success(t("roles.edit.success"));
        handleSuccess();
      } catch (error) {
        toast.error(readApiError(error).message ?? t("roles.edit.error"));
      }
    },
  );

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("fields.name")}</Form.Label>
                <Form.Control>
                  <Input {...field} disabled />
                </Form.Control>
                <Form.Hint>{t("roles.edit.nameHint")}</Form.Hint>
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="description"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>{t("fields.description")}</Form.Label>
                <Form.Control>
                  <Textarea
                    {...field}
                    placeholder={t("roles.create.descriptionPlaceholder")}
                    rows={3}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("roles.fields.permissions")}</Form.Label>
                <Form.Control>
                  <PermissionsField
                    value={field.value}
                    onChange={field.onChange}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
