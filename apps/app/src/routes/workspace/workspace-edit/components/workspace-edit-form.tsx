import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useEditWorkspace } from "@/hooks/api/workspace";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@medusajs/ui";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import { FileUpload, Form } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  createWorkspaceEditSchema,
  type WorkspaceEditFormData,
} from "../schemas";

type WorkspaceEditFormProps = {
  workspace: WorkSpaceGetResponseDto;
};

export function WorkspaceEditForm({ workspace }: WorkspaceEditFormProps) {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm<WorkspaceEditFormData>({
    resolver: zodResolver(createWorkspaceEditSchema(workspace.slug)),
    defaultValues: {
      name: workspace.name || "",
      slug: workspace.slug || "",
      avatar: workspace.avatar
        ? {
            file: undefined,
            url: workspace.avatar,
          }
        : undefined,
    },
  });

  const { mutateAsync, isPending } = useEditWorkspace();

  const handleSubmit = form.handleSubmit(
    async ({ name, slug }) => {
      try {
        // The update endpoint takes no avatar yet, and it rejects a body key
        // its DTO does not declare.
        await mutateAsync({ name, slug });
        // The slug is the URL: after a change, the old one no longer resolves.
        handleSuccess(`/${slug}/${ROUTES.Settings}/${ROUTES.Workspace}`);
      } catch (error) {
        console.error("Failed to update workspace:", error);
      }
    },
    (e) => console.log(e),
  );

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("fields.name")}</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      placeholder={t("workspace.placeholders.name")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="slug"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("fields.slug")}</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      placeholder={t("workspace.placeholders.slug")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="avatar"
              render={({ field, fieldState }) => (
                <Form.Item>
                  <Form.Label optional>
                    {t("workspace.fields.avatar")}
                  </Form.Label>
                  <Form.Control>
                    <div className="flex gap-4">
                      {field.value?.url && (
                        <img
                          src={field.value.url}
                          alt="Workspace avatar"
                          className="size-32 rounded-lg object-cover border border-ui-border-base bg-ui-bg-component"
                        />
                      )}
                      <FileUpload
                        formats={[
                          "image/jpeg",
                          "image/png",
                          "image/jpg",
                          "image/webp",
                        ]}
                        label={t("workspace.fields.avatar")}
                        onUploaded={(files) => {
                          if (files[0]) {
                            field.onChange({
                              file: files[0].file,
                              url: files[0].url,
                            });
                          }
                        }}
                        hasError={!!fieldState.error?.message}
                        className={field.value?.url ? "flex-1 h-32" : "h-32"}
                        multiple={false}
                      />
                    </div>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {isPending ? t("workspace.edit.updating") : t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
}
