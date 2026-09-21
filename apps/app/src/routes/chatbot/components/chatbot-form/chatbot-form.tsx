import { TipTapEditor } from "@/components/common/tiptap-editor";
import { RouteFocusModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useChatbotModels } from "@/hooks/api/chatbot";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Select, Textarea } from "@medusajs/ui";
import { Form, SingleAccordion, SwitchBox } from "@repo/ui/common-components";
import {
  IconCircleChevronsRightFilled,
  IconShieldCheckFilled,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CHATBOT_FORM_DEFAULTS, CHATBOT_LANGUAGES } from "../../constants";
import { createChatbotSchema, type ChatbotFormData } from "../../schemas";
import { LinkedAccountsField } from "../linked-accounts-field";
import { ChatbotTypeField } from "./chatbot-type-field";

type ChatbotFormProps = {
  defaultValues?: Partial<ChatbotFormData>;
  onSubmit: (data: ChatbotFormData) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  title: string;
  submitText: string;
  cancelText: string;
  nameLabel: string;
  generalKnowledgeLabel: string;
  generalKnowledgePlaceholder: string;
  typeLabel: string;
  className?: string;
};

export function ChatbotForm({
  defaultValues = CHATBOT_FORM_DEFAULTS,
  onSubmit,
  onCancel,
  isPending = false,
  submitText,
  cancelText,
  nameLabel,
  generalKnowledgeLabel,
  generalKnowledgePlaceholder,
  typeLabel,
}: ChatbotFormProps) {
  const { t } = useTranslation();

  const form = useForm<ChatbotFormData>({
    resolver: zodResolver(createChatbotSchema),
    defaultValues,
  });

  const { models, isLoading: modelsLoading } = useChatbotModels();
  const groupedModels = useMemo(() => {
    const g: Record<string, typeof models> = {};
    for (const m of models) (g[m.provider] ??= []).push(m);
    return g;
  }, [models]);

  const handleSubmit = form.handleSubmit(
    async (data) => {
      await onSubmit(data);
    },
    (e) => console.error(e),
  );

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col max-h-screen"
      >
        <RouteFocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <Button type="button" onClick={onCancel} variant="secondary">
              {cancelText}
            </Button>
            <Button type="submit" disabled={isPending} isLoading={isPending}>
              {submitText}
            </Button>
          </div>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex flex-col items-center p-16 overflow-auto">
          <div className="flex w-full items-center max-w-[720px] flex-col gap-y-8 justify-center">
            <div className="space-y-6 w-full">
              <Form.Field
                name="name"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{nameLabel}</Form.Label>
                    <Form.Control>
                      <Input
                        placeholder="Enter chatbot name"
                        {...field}
                        className="w-full"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />

              <Form.Field
                name="generalKnowledge"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{generalKnowledgeLabel}</Form.Label>
                    <Form.Hint>
                      A prompt that determine chatbot personality and knowledge
                      base.
                    </Form.Hint>
                    <Form.Control>
                      <TipTapEditor
                        format="markdown"
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={generalKnowledgePlaceholder}
                        className="w-full"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />

              <Form.Field
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{typeLabel}</Form.Label>
                    <Form.Control>
                      <ChatbotTypeField
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <SwitchBox
                  description={t("chatbot.create.typingIndicator.description")}
                  label={t("chatbot.create.typingIndicator.label")}
                  control={form.control}
                  name={"typingIndicator"}
                  className="h-full"
                />
                <SwitchBox
                  description={t("chatbot.create.autoRead.description")}
                  label={t("chatbot.create.autoRead.label")}
                  control={form.control}
                  name={"autoRead"}
                  className="h-full"
                />
              </div>

              <Form.Field
                name="primaryLanguage"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("chatbot.create.primaryLanguage")}
                    </Form.Label>
                    <Form.Hint>
                      {t("chatbot.create.primaryLanguageHint")}
                    </Form.Hint>
                    <Form.Control>
                      <Select {...field} onValueChange={field.onChange}>
                        <Select.Trigger className="w-full">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          {Object.entries(CHATBOT_LANGUAGES).map(
                            ([code, label]) => (
                              <Select.Item key={code} value={code}>
                                {label}
                              </Select.Item>
                            ),
                          )}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />

              <Form.Field
                name="deferedLanguage"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>
                      {t("chatbot.create.deferedLanguage")}
                    </Form.Label>
                    <Form.Hint>
                      {t("chatbot.create.deferedLanguageHint")}
                    </Form.Hint>
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
                          {Object.entries(CHATBOT_LANGUAGES).map(
                            ([code, label]) => (
                              <Select.Item key={code} value={code}>
                                {label}
                              </Select.Item>
                            ),
                          )}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />

              <Form.Field
                name="welcomeMessage"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>
                      {t("chatbot.create.welcomeMessage")}
                    </Form.Label>
                    <Form.Hint>
                      {t("chatbot.create.welcomeMessageHint")}
                    </Form.Hint>
                    <Form.Control>
                      <TipTapEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={t(
                          "chatbot.create.welcomeMessagePlaceholder",
                        )}
                        className="w-full"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />

              <Form.Field
                name="fallbackMessage"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>
                      {t("chatbot.create.fallbackMessage")}
                    </Form.Label>
                    <Form.Hint>
                      {t("chatbot.create.fallbackMessageHint")}
                    </Form.Hint>
                    <Form.Control>
                      <TipTapEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={t(
                          "chatbot.create.fallbackMessagePlaceholder",
                        )}
                        className="w-full"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <SingleAccordion.Root type="single" collapsible>
                <SingleAccordion.Item value="handoff-settings">
                  <SingleAccordion.Header>
                    <span className="flex items-center gap-2">
                      <IconCircleChevronsRightFilled
                        size={16}
                        className="text-ui-fg-subtle"
                      />
                      {t("chatbot.create.handoffSettings")}
                    </span>
                  </SingleAccordion.Header>
                  <SingleAccordion.Content className="space-y-6">
                    <Form.Field
                      name="handoffMessage"
                      control={form.control}
                      render={({ field }) => (
                        <Form.Item>
                          <Form.Label optional>
                            {t("chatbot.create.handoffMessage")}
                          </Form.Label>
                          <Form.Hint>
                            {t("chatbot.create.handoffMessageHint")}
                          </Form.Hint>
                          <Form.Control>
                            <TipTapEditor
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder={t(
                                "chatbot.create.handoffMessagePlaceholder",
                              )}
                              className="w-full"
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />

                    <Form.Field
                      name="handoffKeywords"
                      control={form.control}
                      render={({ field }) => (
                        <Form.Item>
                          <Form.Label optional>
                            {t("chatbot.create.handoffKeywords")}
                          </Form.Label>
                          <Form.Hint>
                            {t("chatbot.create.handoffKeywordsHint")}
                          </Form.Hint>
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
                              placeholder={t(
                                "chatbot.create.handoffKeywordsPlaceholder",
                              )}
                              className="w-full"
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />

                    <Form.Field
                      name="handoffFallbackThreshold"
                      control={form.control}
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
                              value={field.value ?? ""}
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

              <SingleAccordion.Root type="single" collapsible>
                <SingleAccordion.Item value="guardrail-settings">
                  <SingleAccordion.Header>
                    <span className="flex items-center gap-2">
                      <IconShieldCheckFilled
                        size={16}
                        className="text-ui-fg-subtle"
                      />
                      {t("chatbot.create.guardrailSettings")}
                    </span>
                  </SingleAccordion.Header>
                  <SingleAccordion.Content className="space-y-6">
                    <SwitchBox
                      label={t("chatbot.create.guardrailEnabled")}
                      description={t("chatbot.create.guardrailEnabledHint")}
                      control={form.control}
                      name="guardrailEnabled"
                    />
                    <Form.Field
                      name="guardrailModelEnabled"
                      control={form.control}
                      render={({ field }) => {
                        const enabled = form.watch("guardrailEnabled");
                        return (
                          <SwitchBox
                            label={t("chatbot.create.guardrailModelEnabled")}
                            description={t(
                              "chatbot.create.guardrailModelEnabledHint",
                            )}
                            control={form.control}
                            name="guardrailModelEnabled"
                            className={
                              !enabled ? "opacity-50 pointer-events-none" : ""
                            }
                          />
                        );
                      }}
                    />
                    <Form.Field
                      name="guardrailCustomInstruction"
                      control={form.control}
                      render={({ field }) => {
                        const enabled = form.watch("guardrailEnabled");
                        return (
                          <Form.Item
                            className={
                              !enabled ? "opacity-50 pointer-events-none" : ""
                            }
                          >
                            <Form.Label optional>
                              {t("chatbot.create.guardrailCustomInstruction")}
                            </Form.Label>
                            <Form.Hint>
                              {t(
                                "chatbot.create.guardrailCustomInstructionHint",
                              )}
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
                        );
                      }}
                    />
                    <Form.Field
                      name="guardrailEscalateOnBlock"
                      control={form.control}
                      render={() => {
                        const enabled = form.watch("guardrailEnabled");
                        return (
                          <SwitchBox
                            label={t("chatbot.create.guardrailEscalateOnBlock")}
                            description={t(
                              "chatbot.create.guardrailEscalateOnBlockHint",
                            )}
                            control={form.control}
                            name="guardrailEscalateOnBlock"
                            className={
                              !enabled ? "opacity-50 pointer-events-none" : ""
                            }
                          />
                        );
                      }}
                    />
                    <Form.Field
                      name="followupRules"
                      control={form.control}
                      render={({ field }) => (
                        <Form.Item>
                          <Form.Label optional>
                            {t("chatbot.create.followupRules")}
                          </Form.Label>
                          <Form.Hint>
                            {t("chatbot.create.followupRulesHint")}
                          </Form.Hint>
                          <Form.Control>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder={t(
                                "chatbot.create.followupRulesPlaceholder",
                              )}
                              rows={3}
                              className="w-full resize-none"
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />
                  </SingleAccordion.Content>
                </SingleAccordion.Item>
              </SingleAccordion.Root>

              <SingleAccordion.Root type="single" collapsible>
                <SingleAccordion.Item value="advanced-settings">
                  <SingleAccordion.Header>
                    {t("chatbot.create.advancedSettings")}
                  </SingleAccordion.Header>
                  <SingleAccordion.Content className="space-y-6">
                    <Form.Field
                      name="modelTextName"
                      control={form.control}
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
                      control={form.control}
                      render={({ field }) => (
                        <Form.Item>
                          <Form.Label>
                            {t("chatbot.create.temperature")}
                          </Form.Label>
                          <Form.Control>
                            <Input
                              {...field}
                              value={field.value ?? ""}
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
                      control={form.control}
                      render={({ field }) => (
                        <Form.Item>
                          <Form.Label>
                            {t("chatbot.create.maxTokens")}
                          </Form.Label>
                          <Form.Control>
                            <Input
                              {...field}
                              value={field.value ?? ""}
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

              <Form.Field
                name="accounts"
                control={form.control}
                render={({ field }) => (
                  <LinkedAccountsField
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </RouteFocusModal.Body>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
}
