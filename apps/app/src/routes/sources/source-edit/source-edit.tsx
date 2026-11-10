import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import {
  useTrackedLink,
  useUpdateTrackedLink,
  type TrackedLinkDetailResponseDto,
} from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input, Textarea, toast } from "@medusajs/ui";
import { Form, FormSkeleton } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { SourceTagsField } from "../components/source-tags-field";
import { sourceEditSchema, type SourceEditFormData } from "../schemas";

export const SourceEdit = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { sourceId = "" } = useParams<{ sourceId: string }>();

  const { link, isLoading, isError, error } = useTrackedLink(
    workspaceSlug,
    sourceId,
  );

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("customerSources.edit.title")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("customerSources.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isLoading || !link ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        <SourceEditForm link={link} />
      )}
    </RouteDrawer>
  );
};

const SourceEditForm: FC<{ link: TrackedLinkDetailResponseDto }> = ({
  link,
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const { mutateAsync, isPending } = useUpdateTrackedLink(
    workspaceSlug,
    link.id,
  );

  const isWebsite = link.account.type === "WEBSITE_WIDGET";

  const form = useForm<SourceEditFormData>({
    resolver: zodResolver(sourceEditSchema),
    defaultValues: {
      name: link.name,
      isWebsite,
      targetUrl: link.targetUrl ?? "",
      greeting: link.greeting ?? "",
      tagIds: link.tagIds,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await mutateAsync({
        name: data.name,
        greeting: data.greeting || null,
        tagIds: data.tagIds,
        ...(isWebsite && { targetUrl: data.targetUrl }),
      });
      toast.success(t("customerSources.edit.saved"));
      handleSuccess();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("customerSources.error"));
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
                <Form.Label>{t("customerSources.form.name")}</Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.Hint>{t("customerSources.form.nameHint")}</Form.Hint>
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
                  <Form.Label>{t("customerSources.form.targetUrl")}</Form.Label>
                  <Form.Control>
                    <Input {...field} type="url" placeholder="https://" />
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
                  <Textarea {...field} rows={3} />
                </Form.Control>
                <Form.Hint>{t("customerSources.form.greetingHint")}</Form.Hint>
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
                <Form.Hint>{t("customerSources.form.tagsHint")}</Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" type="button">
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
