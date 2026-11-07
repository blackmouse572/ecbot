import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useAllCountriesShare, useUpdateProfile } from "@/hooks/api";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Select, toast } from "@medusajs/ui";
import type { UserProfileResponseDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { profileEditSchema, type ProfileEditFormData } from "../schemas";

type ProfileEditFormProps = { user: UserProfileResponseDto };

/** The signed-in user's name and country. */
export const ProfileEditForm: FC<ProfileEditFormProps> = ({ user }) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { countries } = useAllCountriesShare();
  const { mutateAsync, isPending } = useUpdateProfile();

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema()),
    defaultValues: { name: user.name ?? "", country: user.country?.id ?? "" },
  });

  const handleSubmit = form.handleSubmit(async ({ name, country }) => {
    try {
      await mutateAsync({ name, country });
      toast.success(t("profile.edit.success"));
      handleSuccess();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("profile.edit.error"));
    }
  });

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
                  <Input {...field} autoComplete="name" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="country"
            render={({ field: { onChange, ref, ...field } }) => (
              <Form.Item>
                <Form.Label>{t("profile.fields.country")}</Form.Label>
                <Form.Control>
                  <Select {...field} onValueChange={onChange}>
                    <Select.Trigger ref={ref}>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {(countries ?? []).map((country) => (
                        <Select.Item key={country.id} value={country.id}>
                          {country.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
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
