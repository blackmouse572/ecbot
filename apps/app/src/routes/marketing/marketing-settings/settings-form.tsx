import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import {
  useUpdateMarketingSettings,
  type MarketingSettingsGetResponseDto,
} from "@/hooks/api/marketing-settings";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Select, Text, Textarea, toast } from "@medusajs/ui";
import { Form, SwitchBox, TagInput } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { MARKETING_SEND_HOURS } from "../constants";
import {
  marketingSettingsFormSchema,
  type MarketingSettingsFormData,
} from "../schemas";

type SettingsFormProps = { settings: MarketingSettingsGetResponseDto };

export const SettingsForm: FC<SettingsFormProps> = ({ settings }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const update = useUpdateMarketingSettings(workspaceSlug);

  const form = useForm<MarketingSettingsFormData>({
    resolver: zodResolver(marketingSettingsFormSchema),
    defaultValues: {
      sendFrom: settings.sendFrom,
      sendTo: settings.sendTo,
      maxPer30Days: settings.maxPer30Days,
      restAfter: settings.restAfter,
      restDays: settings.restDays,
      stopKeywords: settings.stopKeywords,
      stopReplyEnabled: settings.stopReplyEnabled,
      stopReply: settings.stopReply ?? "",
    },
  });

  // A saved time off the hour (set through the API) stays pickable.
  const hours = (current: string) =>
    MARKETING_SEND_HOURS.includes(current)
      ? MARKETING_SEND_HOURS
      : [...MARKETING_SEND_HOURS, current].sort();

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await update.mutateAsync({
        ...data,
        // None: the built-in words, which the API keeps as null.
        stopKeywords: data.stopKeywords.length ? data.stopKeywords : null,
        // Empty: the built-in confirmation in the agent's language.
        stopReply: data.stopReply || null,
      });
      toast.success(t("marketing.settings.saved"));
      handleSuccess();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("marketing.settings.error"));
    }
  });

  const hourSelect = (name: "sendFrom" | "sendTo") => (
    <Form.Field
      control={form.control}
      name={name}
      render={({ field: { value, onChange, ...field } }) => (
        <Form.Item>
          <Form.Control>
            <Select {...field} value={value} onValueChange={onChange}>
              <Select.Trigger
                className="w-28"
                aria-label={t(`marketing.settings.${name}`)}
              >
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {hours(value).map((hour) => (
                  <Select.Item key={hour} value={hour}>
                    {hour}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Form.Control>
          <Form.ErrorMessage />
        </Form.Item>
      )}
    />
  );

  const numberField = (name: "maxPer30Days" | "restAfter" | "restDays") => (
    <Form.Field
      control={form.control}
      name={name}
      render={({ field: { value, onChange, ...field } }) => (
        <Form.Item>
          <Form.Control>
            <Input
              {...field}
              type="number"
              min={1}
              className="w-20 tabular-nums"
              aria-label={t(`marketing.settings.${name}`)}
              // An empty box stays NaN, so the schema names the field.
              value={Number.isNaN(value) ? "" : value}
              onChange={(event) => onChange(event.target.valueAsNumber)}
            />
          </Form.Control>
        </Form.Item>
      )}
    />
  );

  const { errors } = form.formState;

  const numberError =
    errors.maxPer30Days?.message ??
    errors.restAfter?.message ??
    errors.restDays?.message;

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
          <section className="flex flex-col gap-y-2">
            <Text size="small" weight="plus">
              {t("marketing.settings.hours")}
            </Text>
            <div className="flex items-start gap-x-2">
              {hourSelect("sendFrom")}
              <Text size="small" className="text-ui-fg-subtle pt-2">
                {t("marketing.settings.to")}
              </Text>
              {hourSelect("sendTo")}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {t("marketing.settings.hoursHint", {
                time: form.watch("sendFrom"),
              })}
            </Text>
          </section>
          <section className="flex flex-col gap-y-2">
            <Text size="small" weight="plus">
              {t("marketing.settings.cap")}
            </Text>
            <div className="flex items-center gap-x-2">
              {numberField("maxPer30Days")}
              <Text size="small" className="text-ui-fg-subtle">
                {t("marketing.settings.capUnit")}
              </Text>
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {t("marketing.settings.capHint")}
            </Text>
          </section>
          <section className="flex flex-col gap-y-2">
            <Text size="small" weight="plus">
              {t("marketing.settings.rest")}
            </Text>
            <div className="flex flex-wrap items-center gap-2">
              <Text size="small" className="text-ui-fg-subtle">
                {t("marketing.settings.restAfter")}
              </Text>
              {numberField("restAfter")}
              <Text size="small" className="text-ui-fg-subtle">
                {t("marketing.settings.restFor")}
              </Text>
              {numberField("restDays")}
              <Text size="small" className="text-ui-fg-subtle">
                {t("marketing.settings.days")}
              </Text>
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {t("marketing.settings.restHint")}
            </Text>
            {numberError && (
              <Text size="small" className="text-ui-fg-error">
                {numberError}
              </Text>
            )}
          </section>
          <div className="border-ui-border-base border-t" />
          <Form.Field
            control={form.control}
            name="stopKeywords"
            render={({ field: { value, onChange, ...field } }) => (
              <Form.Item>
                <Form.Label>{t("marketing.settings.keywords")}</Form.Label>
                <Form.Control>
                  <TagInput
                    {...field}
                    value={value}
                    onChange={onChange}
                    placeholder={t("marketing.settings.keywordsPlaceholder")}
                  />
                </Form.Control>
                <Form.Hint>{t("marketing.settings.keywordsHint")}</Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="flex flex-col gap-y-2">
            <SwitchBox
              control={form.control}
              name="stopReplyEnabled"
              label={t("marketing.settings.stopReply")}
              description={t("marketing.settings.stopReplyHint")}
            />
            {form.watch("stopReplyEnabled") && (
              <Form.Field
                control={form.control}
                name="stopReply"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Control>
                      <Textarea
                        {...field}
                        rows={3}
                        aria-label={t("marketing.settings.stopReplyText")}
                        placeholder={t(
                          "marketing.settings.stopReplyPlaceholder",
                        )}
                      />
                    </Form.Control>
                    <Form.Hint>
                      {t("marketing.settings.stopReplyTextHint")}
                    </Form.Hint>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            )}
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={update.isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
