import { useChatbotModels } from "@/hooks/api/chatbot";
import { Input, Select, Textarea } from "@medusajs/ui";
import { Form, SingleAccordion, SwitchBox } from "@repo/ui/common-components";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ChatbotFormInput } from "../../schemas";

/**
 * Reply behavior, handoff rules, guardrails and follow-ups, with the model
 * tuning folded away under Advanced: what the settings card shows.
 */
export function ChatbotSettingsFields() {
  const { t } = useTranslation();
  const { control, watch } = useFormContext<ChatbotFormInput>();
  const guardrailOff = !watch("guardrailEnabled");
  const dimmedWhenOff = guardrailOff ? "opacity-50 pointer-events-none" : "";

  const { models, isLoading: modelsLoading } = useChatbotModels();
  const groupedModels = useMemo(() => {
    const g: Record<string, typeof models> = {};
    for (const m of models) (g[m.provider] ??= []).push(m);
    return g;
  }, [models]);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SwitchBox
          description={t("chatbot.create.typingIndicator.description")}
          label={t("chatbot.create.typingIndicator.label")}
          control={control}
          name="typingIndicator"
          className="h-full"
        />
        <SwitchBox
          description={t("chatbot.create.autoRead.description")}
          label={t("chatbot.create.autoRead.label")}
          control={control}
          name="autoRead"
          className="h-full"
        />
      </div>

      <Form.Field
        name="handoffKeywords"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>
              {t("chatbot.create.handoffKeywords")}
            </Form.Label>
            <Form.Hint>{t("chatbot.create.handoffKeywordsHint")}</Form.Hint>
            <Form.Control>
              <Input
                value={(field.value ?? []).join(", ")}
                onChange={(e) =>
                  field.onChange(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder={t("chatbot.create.handoffKeywordsPlaceholder")}
                className="w-full"
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        name="handoffFallbackThreshold"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>
              {t("chatbot.create.handoffFallbackThreshold")}
            </Form.Label>
            <Form.Hint>
              {t("chatbot.create.handoffFallbackThresholdHint")}
            </Form.Hint>
            <Form.Control>
              <Input
                {...field}
                value={(field.value as number | undefined) ?? ""}
                type="number"
                min="1"
                className="w-full"
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <SwitchBox
        label={t("chatbot.create.guardrailEnabled")}
        description={t("chatbot.create.guardrailEnabledHint")}
        control={control}
        name="guardrailEnabled"
      />
      <SwitchBox
        label={t("chatbot.create.guardrailModelEnabled")}
        description={t("chatbot.create.guardrailModelEnabledHint")}
        control={control}
        name="guardrailModelEnabled"
        className={dimmedWhenOff}
      />
      <Form.Field
        name="guardrailCustomInstruction"
        control={control}
        render={({ field }) => (
          <Form.Item className={dimmedWhenOff}>
            <Form.Label optional>
              {t("chatbot.create.guardrailCustomInstruction")}
            </Form.Label>
            <Form.Hint>
              {t("chatbot.create.guardrailCustomInstructionHint")}
            </Form.Hint>
            <Form.Control>
              <Textarea
                {...field}
                value={field.value ?? ""}
                placeholder={t(
                  "chatbot.create.guardrailCustomInstructionPlaceholder",
                )}
                rows={3}
                className="w-full resize-none"
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <SwitchBox
        label={t("chatbot.create.guardrailEscalateOnBlock")}
        description={t("chatbot.create.guardrailEscalateOnBlockHint")}
        control={control}
        name="guardrailEscalateOnBlock"
        className={dimmedWhenOff}
      />

      <Form.Field
        name="followupRules"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>
              {t("chatbot.create.followupRules")}
            </Form.Label>
            <Form.Hint>{t("chatbot.create.followupRulesHint")}</Form.Hint>
            <Form.Control>
              <Textarea
                {...field}
                value={field.value ?? ""}
                placeholder={t("chatbot.create.followupRulesPlaceholder")}
                rows={3}
                className="w-full resize-none"
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <SingleAccordion.Root type="single" collapsible>
        <SingleAccordion.Item value="advanced-settings">
          <SingleAccordion.Header>
            {t("chatbot.create.advancedSettings")}
          </SingleAccordion.Header>
          <SingleAccordion.Content className="space-y-6">
            <Form.Field
              name="modelTextName"
              control={control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("chatbot.create.model")}</Form.Label>
                  <Form.Hint>{t("chatbot.create.modelHint")}</Form.Hint>
                  <Form.Control>
                    <Select
                      {...field}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {modelsLoading ? (
                          <div className="text-ui-fg-muted px-2 py-1.5 text-sm">
                            {t("chatbot.create.modelsLoading")}
                          </div>
                        ) : (
                          Object.entries(groupedModels).map(
                            ([provider, items]) => (
                              <div key={provider}>
                                <div className="text-ui-fg-muted px-2 py-1 text-xs uppercase">
                                  {provider}
                                </div>
                                {items.map((m) => (
                                  <Select.Item key={m.id} value={m.id}>
                                    {m.name}
                                  </Select.Item>
                                ))}
                              </div>
                            ),
                          )
                        )}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name="modelTemperature"
              control={control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("chatbot.create.temperature")}</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      value={(field.value as number | undefined) ?? ""}
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      className="w-full"
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name="maxTokens"
              control={control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("chatbot.create.maxTokens")}</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      value={(field.value as number | undefined) ?? ""}
                      type="number"
                      min="1"
                      className="w-full"
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </SingleAccordion.Content>
        </SingleAccordion.Item>
      </SingleAccordion.Root>
    </>
  );
}
