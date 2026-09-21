import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useCreateWorkspace } from "@/hooks/api/workspace";
import { Alert, Button, Input, toast } from "@medusajs/ui";
import { FileUpload, Form } from "@repo/ui/common-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import i18n from "@/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod/v4";

const onboardCreateSchema = z.object({
  name: z
    .string()
    .min(1, i18n.t("errors.required"))
    .trim()
    .max(255, i18n.t("errors.maxLength", { maxLength: 255 })),
  handler: z
    .string()
    .trim()
    // only lowercase letters, numbers, and hyphens
    .max(30, i18n.t("errors.maxLength", { maxLength: 30 }))
    .optional()
    .refine((value) => {
      if (value && !/^[a-z0-9-]+$/.test(value)) {
        return false;
      }
      return true;
    }, i18n.t("errors.slug")),
  avatar: z
    .object({
      url: z.string(),
      id: z.string(),
      file: z
        .file()
        .mime(["image/jpeg", "image/png", "image/jpg", "image/webp"])
        .max(1024 * 1024 * 5, i18n.t("errors.maxFileSize", { maxFileSize: 5 })),
    })
    .optional(),
});

export const OnboardCreateForm = () => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const form = useForm<z.infer<typeof onboardCreateSchema>>({
    resolver: zodResolver(onboardCreateSchema),
    defaultValues: {
      name: "",
      handler: "",
    },
  });

  const { mutateAsync: createWorkspace, error } = useCreateWorkspace();
  const navigate = useNavigate();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit(
    async (data) => {
      setAlertMessage(null);
      // The server generates the slug, so redirect using the returned
      // workspace rather than the submitted handler.
      const request = createWorkspace({
        name: data.name,
        slug: data.handler,
        image: data.avatar?.file,
      }).then((res) => res.data);

      toast.promise(request, {
        loading: t("onboard.create.toast.loading"),
        error: error?.message || t("onboard.create.toast.error"),
        success: t("onboard.create.toast.success"),
      });

      try {
        const body = (await request) as { data?: { slug?: string } };
        const slug = body?.data?.slug;
        if (slug) {
          handleSuccess(`/${slug}`);
        }
      } catch (e) {
        // 409 = slug already taken. Highlight the field and show a banner.
        // Other errors are surfaced via toast.promise above.
        if (
          e &&
          typeof e === "object" &&
          "status" in e &&
          (e as { status?: number }).status === 409
        ) {
          setAlertMessage(t("onboard.create.errors.slugTaken"));
          form.setError("handler", {
            type: "manual",
            message: t("onboard.create.errors.slugTaken"),
          });
        }
      }
    },
    (e) => {
      console.log(e);
    },
  );

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        className="flex-1 flex flex-col h-full"
        onSubmit={handleSubmit}
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-col items-center p-16 h-full">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            {alertMessage && <Alert variant="error">{alertMessage}</Alert>}
            <div className="grid grid-cols-2 gap-2">
              <Form.Field
                name="name"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("onboard.create.fields.name")}</Form.Label>
                    <Form.Control>
                      <Input
                        className="w-full"
                        placeholder={t("onboard.create.placeholders.name")}
                        {...field}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                name="handler"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>
                      {t("onboard.create.fields.handler")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        className="w-full"
                        placeholder={t("onboard.create.placeholders.handler")}
                        {...field}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>
            <div>
              <Form.Field
                name="avatar"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Form.Item>
                    <Form.Label optional>
                      {t("onboard.create.fields.avatar")}
                    </Form.Label>
                    <Form.Control>
                      <div className="flex gap-4">
                        <img
                          src={field.value?.url}
                          className="size-32 rounded-lg object-cover
                              border border-ui-border-base bg-ui-bg-component"
                        />

                        <FileUpload
                          formats={[
                            "image/jpeg",
                            "image/png",
                            "image/jpg",
                            "image/webp",
                          ]}
                          label={t("onboard.create.fields.avatar")}
                          onUploaded={(file) => {
                            field.onChange(file[0]);
                          }}
                          hasError={!!fieldState.error?.message}
                          className="flex-1 h-32"
                        />
                      </div>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <RouteFocusModal.Close asChild>
            <Button type="button" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteFocusModal.Close>
          <Button type="submit">{t("actions.create")}</Button>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};
