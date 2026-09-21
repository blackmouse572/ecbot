import { RouteDrawer, useRouteModal } from "@/components/modals";
import { useAccount, useUpdateApiChannelCallbackUrl } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Button, Heading, Input, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

type FormValues = {
  callbackUrl: string;
};

function AccountCallbackUrlEditInner() {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { id } = useParams<{ id: string }>();
  const { account, isLoading } = useAccount(id ?? "", { enabled: !!id });
  const { mutateAsync: updateCallbackUrl, isPending } =
    useUpdateApiChannelCallbackUrl(id ?? "");

  const form = useForm<FormValues>({
    defaultValues: { callbackUrl: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (account?.callbackUrl) {
      form.reset({ callbackUrl: account.callbackUrl });
    }
  }, [account?.callbackUrl, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateCallbackUrl(values.callbackUrl.trim());
      toast.success(t("accounts.details.apiChannel.edit.success"));
      handleSuccess();
    } catch {
      toast.error(t("accounts.details.apiChannel.edit.error"));
    }
  });

  if (isLoading || !account) {
    return (
      <RouteDrawer.Body className="p-6">
        <Text size="small" className="text-ui-fg-subtle">
          …
        </Text>
      </RouteDrawer.Body>
    );
  }

  return (
    <>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading level="h2">
            {t("accounts.details.apiChannel.edit.title")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description asChild>
          <Text size="small" className="text-ui-fg-subtle">
            {t("accounts.details.apiChannel.edit.subtitle")}
          </Text>
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Form form={form}>
        <RouteDrawer.Body className="flex flex-col gap-y-4 p-6">
          <Form.Field
            name="callbackUrl"
            control={form.control}
            rules={{
              required: t("accounts.details.apiChannel.callbackLabel"),
              // HTTPS only — matches the provision-time validation.
              pattern: {
                value: /^https:\/\/.+/i,
                message: t("accounts.details.apiChannel.edit.callbackInvalid"),
              },
            }}
            render={({ field }) => (
              <Form.Item className="flex flex-col gap-y-2">
                <Form.Label>
                  {t("accounts.details.apiChannel.callbackLabel")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder="https://your-app.example.com/eccho/replies"
                    autoComplete="off"
                    {...field}
                  />
                </Form.Control>
                <Form.Hint>
                  {t("accounts.details.apiChannel.edit.callbackHint")}
                </Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="ml-auto flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button type="button" variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button
              type="button"
              size="small"
              onClick={handleSubmit}
              disabled={!form.formState.isValid || isPending}
              isLoading={isPending}
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </RouteDrawer.Form>
    </>
  );
}

export const AccountCallbackUrlEdit = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const { id } = useParams<{ id: string }>();

  return (
    <RouteDrawer prev={`/${workspaceSlug}/${ROUTES.Accounts}/${id}`}>
      <AccountCallbackUrlEditInner />
    </RouteDrawer>
  );
};
