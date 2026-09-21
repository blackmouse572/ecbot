import { RouteDrawer, useRouteModal } from "@/components/modals";
import { useAccount, useUpdateWebsiteWidgetAllowedOrigins } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Button, Heading, Input, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

type FormValues = {
  allowedOrigins: string;
};

/** Comma-separated origins → trimmed, non-empty entries. Mirrors the create-flow parsing. */
function splitOrigins(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

function AccountAllowedOriginsEditInner() {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { id } = useParams<{ id: string }>();
  const { account, isLoading } = useAccount(id ?? "", { enabled: !!id });
  const { mutateAsync: updateAllowedOrigins, isPending } =
    useUpdateWebsiteWidgetAllowedOrigins(id ?? "");

  const form = useForm<FormValues>({
    defaultValues: { allowedOrigins: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (account?.allowedOrigins) {
      form.reset({ allowedOrigins: account.allowedOrigins.join(", ") });
    }
  }, [account?.allowedOrigins, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateAllowedOrigins(splitOrigins(values.allowedOrigins));
      toast.success(t("accounts.details.websiteWidget.edit.success"));
      handleSuccess();
    } catch {
      toast.error(t("accounts.details.websiteWidget.edit.error"));
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
            {t("accounts.details.websiteWidget.edit.title")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description asChild>
          <Text size="small" className="text-ui-fg-subtle">
            {t("accounts.details.websiteWidget.edit.subtitle")}
          </Text>
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Form form={form}>
        <RouteDrawer.Body className="flex flex-col gap-y-4 p-6">
          <Form.Field
            name="allowedOrigins"
            control={form.control}
            rules={{
              required: t("accounts.details.websiteWidget.originsLabel"),
              validate: (value: string) =>
                splitOrigins(value).every(isHttpUrl) ||
                t("accounts.details.websiteWidget.edit.originsInvalid"),
            }}
            render={({ field }) => (
              <Form.Item className="flex flex-col gap-y-2">
                <Form.Label>
                  {t("accounts.details.websiteWidget.originsLabel")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder="https://shop.example.com, https://www.example.com"
                    autoComplete="off"
                    {...field}
                  />
                </Form.Control>
                <Form.Hint>
                  {t("accounts.details.websiteWidget.edit.originsHint")}
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

export const AccountAllowedOriginsEdit = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const { id } = useParams<{ id: string }>();

  return (
    <RouteDrawer prev={`/${workspaceSlug}/${ROUTES.Accounts}/${id}`}>
      <AccountAllowedOriginsEditInner />
    </RouteDrawer>
  );
};
