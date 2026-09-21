import { RouteFocusModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { Button, Input, Textarea } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PermissionsField } from ".";
import type { RoleFormData } from "../../schemas";

interface RoleFormProps {
  form: UseFormReturn<RoleFormData>;
  onSubmit: (data: RoleFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
  submitText: string;
  cancelText: string;
}

export function RoleForm({
  form,
  onSubmit,
  onCancel,
  isPending,
  title,
  submitText,
  cancelText,
}: RoleFormProps) {
  const { t } = useTranslation();

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col max-h-screen"
      >
        <RouteFocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isPending}
            >
              {cancelText}
            </Button>
            <Button type="submit" disabled={isPending} isLoading={isPending}>
              {submitText}
            </Button>
          </div>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex flex-col items-center overflow-auto">
          <div className="flex flex-col gap-6 px-6 py-4 w-full max-w-[720px]">
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("fields.name", "Name")}</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      placeholder={t(
                        "roles.create.namePlaceholder",
                        "Enter role name",
                      )}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="description"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("fields.description", "Description")}
                  </Form.Label>
                  <Form.Control>
                    <Textarea
                      {...field}
                      placeholder={t(
                        "roles.create.descriptionPlaceholder",
                        "Enter role description",
                      )}
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
                  <Form.Label>
                    {t("roles.permissions.title", "Permissions")}
                  </Form.Label>
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
          </div>
        </RouteFocusModal.Body>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
}
