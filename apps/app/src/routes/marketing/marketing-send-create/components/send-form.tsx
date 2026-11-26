import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import type { MarketingOverviewTodoDto } from "@/hooks/api/marketing-overview";
import {
  useCreateMarketingSend,
  useDraftMarketingSend,
  type MarketingSendDraftRequestDto,
} from "@/hooks/api/marketing-sends";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, InlineTip, RadioGroup, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useEffect, useRef, type FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { MARKETING_SEND_MODES } from "../../constants";
import {
  marketingSendFormSchema,
  type MarketingSendFormData,
} from "../../schemas";
import { SendAudience } from "./send-audience";
import { SendMessage } from "./send-message";
import { SendStep } from "./send-step";

type Preset = MarketingOverviewTodoDto["key"];

type Rewrite = NonNullable<MarketingSendDraftRequestDto["rewrite"]>;

export const SendForm: FC<{ preset: Preset }> = ({ preset }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const create = useCreateMarketingSend(workspaceSlug);
  const draft = useDraftMarketingSend(workspaceSlug);

  const form = useForm<MarketingSendFormData>({
    resolver: zodResolver(marketingSendFormSchema),
    defaultValues: {
      offer: "",
      text: "",
      tone: "FRIENDLY",
      mode: "AUTO",
      excludedCustomerIds: [],
    },
  });

  /** Ask the AI for a text; with a rewrite, it works on the current one. */
  const write = async (rewrite?: Rewrite) => {
    const { offer, text, tone } = form.getValues();
    const previous = text.trim();

    const body: MarketingSendDraftRequestDto = {
      preset,
      offer: offer.trim() || undefined,
      tone,
      language: i18n.language === "en" ? "en" : "vi",
    };

    if (rewrite && previous) {
      body.previous = previous;
      body.rewrite = rewrite;
    }

    try {
      const result = await draft.mutateAsync(body);
      form.setValue("text", result.text, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      toast.error(
        readApiError(error).message ?? t("marketing.send.errors.draft"),
      );
    }
  };

  // Ecbot drafts the first text as the drawer opens.
  const drafted = useRef(false);
  useEffect(() => {
    if (drafted.current) return;
    drafted.current = true;
    void write();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode = form.watch("mode");

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await create.mutateAsync({
        preset,
        name: t(`marketing.send.preset.${preset}.title`),
        mode: data.mode,
        text: data.text,
        excludedCustomerIds: data.excludedCustomerIds,
      });
      toast.success(
        t(
          data.mode === "AUTO"
            ? "marketing.send.created.AUTO"
            : "marketing.send.created.ONCE",
        ),
      );
      handleSuccess();
    } catch (error) {
      toast.error(
        readApiError(error).message ?? t("marketing.send.errors.create"),
      );
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <SendAudience form={form} preset={preset} />
          <SendMessage form={form} drafting={draft.isPending} onWrite={write} />
          <SendStep step={3} title={t("marketing.send.mode.title")}>
            <Form.Field
              control={form.control}
              name="mode"
              render={({ field: { onChange, ...field } }) => (
                <Form.Item>
                  <Form.Control>
                    <RadioGroup
                      {...field}
                      onValueChange={onChange}
                      className="flex flex-col gap-y-2"
                    >
                      {MARKETING_SEND_MODES.map((value) => (
                        <RadioGroup.ChoiceBox
                          key={value}
                          value={value}
                          label={t(`marketing.send.mode.${value}.label`)}
                          description={t(`marketing.send.mode.${value}.hint`)}
                        />
                      ))}
                    </RadioGroup>
                  </Form.Control>
                </Form.Item>
              )}
            />
            <InlineTip label={t("marketing.send.mode.limitsLabel")}>
              {t("marketing.send.mode.limits")}
            </InlineTip>
          </SendStep>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex w-full items-center justify-between gap-x-2">
            <Text size="small" className="text-ui-fg-subtle">
              {t("marketing.send.footer")}
            </Text>
            <div className="flex items-center gap-x-2">
              <RouteDrawer.Close asChild>
                <Button size="small" variant="secondary" type="button">
                  {t("actions.cancel")}
                </Button>
              </RouteDrawer.Close>
              <Button
                size="small"
                type="submit"
                isLoading={create.isPending}
                disabled={draft.isPending}
              >
                {t(`marketing.send.submit.${mode}`)}
              </Button>
            </div>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
