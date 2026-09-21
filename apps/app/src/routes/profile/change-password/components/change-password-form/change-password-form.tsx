import { useChangePassword } from "@/hooks/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { Form, Input } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  changePasswordFormSchema,
  type TChangePasswordFormSchema,
} from "./schema";

// Zod carries a bare token; the field decides how to phrase it.
const localizeError = (
  message: string | undefined,
  t: (key: string) => string,
) => {
  if (message === "passwordMismatch")
    return t("changePassword.errors.mismatch");
  if (message === "sameAsCurrent")
    return t("changePassword.errors.sameAsCurrent");
  return message;
};

export const ChangePasswordForm = () => {
  const { t } = useTranslation();
  const { changePassword, isLoading } = useChangePassword();

  const form = useForm<TChangePasswordFormSchema>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(
    async ({ currentPassword, newPassword }) => {
      try {
        await changePassword({ oldPassword: currentPassword, newPassword });
        toast.success(t("changePassword.success.message"));
        form.reset();
      } catch {
        toast.error(t("changePassword.errors.failed"));
      }
    },
  );

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("changePassword.domain")}</Heading>
          <Text>{t("changePassword.description")}</Text>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-4">
          <Form.Field
            control={form.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    errorMessage={localizeError(fieldState.error?.message, t)}
                    {...field}
                    placeholder={t("changePassword.fields.currentPassword")}
                  />
                </Form.Control>
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    errorMessage={localizeError(fieldState.error?.message, t)}
                    {...field}
                    placeholder={t("changePassword.fields.newPassword")}
                  />
                </Form.Control>
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="confirmNewPassword"
            render={({ field, fieldState }) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    errorMessage={localizeError(fieldState.error?.message, t)}
                    {...field}
                    placeholder={t("changePassword.fields.confirmNewPassword")}
                  />
                </Form.Control>
              </Form.Item>
            )}
          />
          <div className="flex items-center justify-end gap-x-2">
            <Button
              type="button"
              variant="transparent"
              disabled={isLoading}
              onClick={() => form.reset()}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {t("actions.save")}
            </Button>
          </div>
        </form>
      </Form>
    </Container>
  );
};
