import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useAccounts } from "@/hooks/api/accounts";
import {
  useCreateTrackedLink,
  type TrackedLinkGetResponseDto,
} from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Heading,
  Input,
  ProgressTabs,
  Text,
  Textarea,
  toast,
  type ProgressStatus,
} from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SourceChannelPicker } from "../components/source-channel-picker";
import { SourcePreviewCard } from "../components/source-preview-card";
import { SourceShareStep } from "../components/source-share-step";
import { SourceTagsField } from "../components/source-tags-field";
import { sourceCreateSchema, type SourceCreateFormData } from "../schemas";

type Step = "CREATE" | "SHARE";

export const SourceCreate = () => (
  <RouteFocusModal>
    <SourceCreateForm />
  </RouteFocusModal>
);

const SourceCreateForm = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  // SAFETY: the API reads perPage on the account list, the generated query
  // type leaves it out (same as the conversation list).
  const { accounts } = useAccounts({ perPage: 100 } as never);
  const { mutateAsync, isPending } = useCreateTrackedLink(workspaceSlug);
  const [step, setStep] = useState<Step>("CREATE");

  const [created, setCreated] = useState<TrackedLinkGetResponseDto | null>(
    null,
  );

  const form = useForm<SourceCreateFormData>({
    resolver: zodResolver(sourceCreateSchema),
    defaultValues: {
      name: "",
      accountId: "",
      isWebsite: false,
      targetUrl: "",
      greeting: "",
      tagIds: [],
    },
  });

  const [name, accountId, isWebsite, targetUrl] = form.watch([
    "name",
    "accountId",
    "isWebsite",
    "targetUrl",
  ]);

  const account = accounts?.find((item) => item.id === accountId);

  const detailPath = created
    ? `/${workspaceSlug}/${ROUTES.CustomerSources}/${created.id}`
    : "";

  const handleSubmit = form.handleSubmit(async (data) => {
    if (created) {
      handleSuccess(detailPath);

      return;
    }

    try {
      const link = await mutateAsync({
        name: data.name,
        accountId: data.accountId,
        targetUrl: data.isWebsite ? data.targetUrl : undefined,
        greeting: data.greeting || undefined,
        tagIds: data.tagIds,
      });

      toast.success(t("customerSources.form.created"));
      setCreated(link);
      setStep("SHARE");
    } catch (error) {
      toast.error(readApiError(error).message ?? t("customerSources.error"));
    }
  });

  const status = (of: Step): ProgressStatus =>
    of === step ? "in-progress" : created ? "completed" : "not-started";

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <ProgressTabs
          value={step}
          className="flex h-full flex-col overflow-hidden"
        >
          <RouteFocusModal.Header>
            <RouteFocusModal.Title asChild>
              <span className="sr-only">{t("customerSources.form.title")}</span>
            </RouteFocusModal.Title>
            <div className="-my-2 w-full min-w-0 border-l">
              <ProgressTabs.List>
                <ProgressTabs.Trigger
                  value="CREATE"
                  status={status("CREATE")}
                  disabled={!!created}
                  className="max-w-[200px]"
                >
                  {t("customerSources.steps.create")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  value="SHARE"
                  status={status("SHARE")}
                  disabled={!created}
                  className="max-w-[200px]"
                >
                  {t("customerSources.steps.share")}
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </div>
          </RouteFocusModal.Header>

          <RouteFocusModal.Body className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
            <ProgressTabs.Content
              value="CREATE"
              className="flex w-full justify-center"
            >
              <div className="flex w-full max-w-[720px] flex-col gap-y-6">
                <div>
                  <Heading>{t("customerSources.form.title")}</Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    {t("customerSources.form.description")}
                  </Text>
                </div>
                <div className="flex flex-col gap-y-4">
                  <Form.Field
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label>
                          {t("customerSources.form.name")}
                        </Form.Label>
                        <Form.Control>
                          <Input
                            {...field}
                            placeholder={t(
                              "customerSources.form.namePlaceholder",
                            )}
                          />
                        </Form.Control>
                        <Form.Hint>
                          {t("customerSources.form.nameHint")}
                        </Form.Hint>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label>
                          {t("customerSources.form.channel")}
                        </Form.Label>
                        <SourceChannelPicker
                          accounts={accounts ?? []}
                          value={field.value}
                          onChange={(account) => {
                            field.onChange(account.id);
                            form.setValue(
                              "isWebsite",
                              account.type === "WEBSITE_WIDGET",
                            );
                          }}
                        />
                        <Form.Hint>
                          {t("customerSources.form.channelHint")}
                        </Form.Hint>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  {isWebsite && (
                    <Form.Field
                      control={form.control}
                      name="targetUrl"
                      render={({ field }) => (
                        <Form.Item>
                          <Form.Label>
                            {t("customerSources.form.targetUrl")}
                          </Form.Label>
                          <Form.Control>
                            <Input
                              {...field}
                              type="url"
                              placeholder="https://"
                            />
                          </Form.Control>
                          <Form.Hint>
                            {t("customerSources.form.targetUrlHint")}
                          </Form.Hint>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />
                  )}
                  <Form.Field
                    control={form.control}
                    name="greeting"
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label optional>
                          {t("customerSources.form.greeting")}
                        </Form.Label>
                        <Form.Control>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder={t(
                              "customerSources.form.greetingPlaceholder",
                            )}
                          />
                        </Form.Control>
                        <Form.Hint>
                          {t("customerSources.form.greetingHint")}
                        </Form.Hint>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="tagIds"
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label optional>
                          {t("customerSources.form.tags")}
                        </Form.Label>
                        <Form.Control>
                          <SourceTagsField
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </Form.Control>
                        <Form.Hint>
                          {t("customerSources.form.tagsHint")}
                        </Form.Hint>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>
                <SourcePreviewCard
                  account={account}
                  name={name}
                  targetUrl={isWebsite ? targetUrl : ""}
                />
              </div>
            </ProgressTabs.Content>
            <ProgressTabs.Content
              value="SHARE"
              className="flex w-full justify-center"
            >
              {created && <SourceShareStep link={created} />}
            </ProgressTabs.Content>
          </RouteFocusModal.Body>

          <RouteFocusModal.Footer>
            <div className="flex w-full items-center justify-end gap-x-2">
              {created ? (
                <>
                  <Text
                    size="small"
                    className="mr-auto hidden text-ui-fg-subtle sm:block"
                  >
                    {t("customerSources.share.later")}
                  </Text>
                  <Button size="small" type="submit">
                    {t("customerSources.share.done")}
                  </Button>
                </>
              ) : (
                <>
                  <RouteFocusModal.Close asChild>
                    <Button size="small" variant="secondary" type="button">
                      {t("actions.cancel")}
                    </Button>
                  </RouteFocusModal.Close>
                  <Button size="small" type="submit" isLoading={isPending}>
                    {t("customerSources.form.submit")}
                  </Button>
                </>
              )}
            </div>
          </RouteFocusModal.Footer>
        </ProgressTabs>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};
