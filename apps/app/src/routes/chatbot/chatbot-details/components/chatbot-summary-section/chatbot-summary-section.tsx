import { useDate } from "@/hooks/use-date";
import { useUpdateChatbot } from "@/hooks/api";
import { Container, Heading, Switch, Tooltip } from "@medusajs/ui";
import { InformationCircle } from "@medusajs/icons";
import { Section, SectionRow } from "@repo/ui/common-components";
import { Accordion } from "@repo/ui/components";

import { ChatbotStatusCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-status-cell";
import { ChatbotTypeCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-cell";
import {
  CHATBOT_LANGUAGES,
  CHATBOT_MODEL_PROVIDERS,
} from "@/routes/chatbot/constants";
import type {
  ChatbotGetDetailResponseDto,
  ChatbotUpdateRequestDto,
} from "@repo/client";
import { useTranslation } from "react-i18next";
import {
  IconShieldCheckFilled,
  IconCircleChevronsRightFilled,
} from "@tabler/icons-react";

type ChatbotSummarySectionProps = { item: ChatbotGetDetailResponseDto };

/** Chatbot flags the summary can flip straight from its rows. */
type ToggleableField =
  | "typingIndicator"
  | "autoRead"
  | "guardrailEnabled"
  | "guardrailModelEnabled"
  | "guardrailEscalateOnBlock";

const buildUpdatePayload = (
  item: ChatbotGetDetailResponseDto,
  overrides: Partial<ChatbotUpdateRequestDto>,
): ChatbotUpdateRequestDto => ({
  name: item.name,
  type: item.type,
  avatar: item.avatar,
  generalKnowledge: item.generalKnowledge,
  accounts: item.accounts?.map((account) => account.id) ?? [],
  typingIndicator: item.typingIndicator,
  autoRead: item.autoRead,
  primaryLanguage: item.primaryLanguage,
  deferedLanguage: item.deferedLanguage,
  welcomeMessage: item.welcomeMessage,
  fallbackMessage: item.fallbackMessage,
  handoffMessage: item.handoffMessage,
  handoffKeywords: item.handoffKeywords,
  handoffFallbackThreshold: item.handoffFallbackThreshold,
  guardrailEnabled: item.guardrailEnabled,
  guardrailModelEnabled: item.guardrailModelEnabled,
  guardrailCustomInstruction: item.guardrailCustomInstruction,
  guardrailEscalateOnBlock: item.guardrailEscalateOnBlock,
  modelTextName: item.modelTextName,
  modelTemperature: item.modelTemperature,
  maxTokens: item.maxTokens,
  ...overrides,
});

export const ChatbotSummarySection = ({ item }: ChatbotSummarySectionProps) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const update = useUpdateChatbot();

  // Every switch sends the whole chatbot back, with one field overridden.
  const onToggle = (key: ToggleableField) => (checked: boolean) =>
    update.mutate({
      id: item.id,
      body: buildUpdatePayload(item, { [key]: checked }),
    });

  const primaryLanguageLabel =
    CHATBOT_LANGUAGES[item.primaryLanguage as keyof typeof CHATBOT_LANGUAGES] ??
    item.primaryLanguage;
  const deferedLanguageLabel = item.deferedLanguage
    ? (CHATBOT_LANGUAGES[
        item.deferedLanguage as keyof typeof CHATBOT_LANGUAGES
      ] ?? item.deferedLanguage)
    : "-";
  const modelProviderLabel =
    CHATBOT_MODEL_PROVIDERS[
      item.modelProvider as keyof typeof CHATBOT_MODEL_PROVIDERS
    ] ?? item.modelProvider;
  const modelLabel = item.modelTextName;

  const overview = [
    { title: t("fields.name"), value: item.name },
    { title: t("fields.type"), value: <ChatbotTypeCell item={item} /> },
    { title: t("fields.status"), value: <ChatbotStatusCell item={item} /> },
    {
      title: t("fields.createdAt"),
      value: getFullDate(new Date(item.createdAt)),
    },
    {
      title: t("fields.updatedAt"),
      value: getFullDate(new Date(item.updatedAt)),
    },
  ];

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 px-6 py-4 border-b">
        <Heading>{t("chatbot.details.summary.title")}</Heading>
      </div>

      {/* Overview */}
      <Section variant="spaced">
        {overview.map((row) => (
          <SectionRow key={row.title} title={row.title} value={row.value} />
        ))}
      </Section>

      <Accordion type="multiple" className="border-t border-ui-border-base">
        {/* Behavior */}
        <Accordion.Item value="behavior">
          <Accordion.Header className="px-6 py-3 text-sm font-medium">
            {t("chatbot.details.summary.behaviorSection")}
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down !pl-0 !pr-0">
            <Section variant="spaced">
              <SectionRow
                title={t("chatbot.details.typingIndicator")}
                value={
                  <Switch
                    checked={item.typingIndicator}
                    disabled={update.isPending}
                    onCheckedChange={onToggle("typingIndicator")}
                  />
                }
              />
              <SectionRow
                title={t("chatbot.details.autoRead")}
                value={
                  <Switch
                    checked={item.autoRead}
                    disabled={update.isPending}
                    onCheckedChange={onToggle("autoRead")}
                  />
                }
              />
              <SectionRow
                title={t("chatbot.create.primaryLanguage")}
                value={primaryLanguageLabel}
              />
              <SectionRow
                title={t("chatbot.create.deferedLanguage")}
                value={deferedLanguageLabel}
              />
              <SectionRow
                title={t("chatbot.create.welcomeMessage")}
                value={item.welcomeMessage ?? "-"}
              />
              <SectionRow
                title={t("chatbot.create.fallbackMessage")}
                value={item.fallbackMessage ?? "-"}
              />
            </Section>
          </Accordion.Content>
        </Accordion.Item>

        {/* AI Model */}
        <Accordion.Item value="ai-model">
          <Accordion.Header className="px-6 py-3 text-sm font-medium">
            {t("chatbot.details.summary.aiModelSection")}
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down !pl-0 !pr-0">
            <Section variant="spaced">
              <SectionRow
                title={t("chatbot.create.modelProvider")}
                value={modelProviderLabel}
              />
              <SectionRow
                title={t("chatbot.create.model")}
                value={modelLabel}
              />
              <SectionRow
                title={t("chatbot.create.temperature")}
                value={String(item.modelTemperature)}
              />
              <SectionRow
                title={t("chatbot.create.maxTokens")}
                value={item.maxTokens != null ? String(item.maxTokens) : "-"}
              />
            </Section>
          </Accordion.Content>
        </Accordion.Item>

        {/* Handoff */}
        <Accordion.Item value="handoff">
          <Accordion.Header className="px-6 py-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <IconCircleChevronsRightFilled
                size={16}
                className="text-ui-fg-subtle"
              />
              {t("chatbot.create.handoffSettings")}
            </span>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down !pl-0 !pr-0">
            <Section variant="spaced">
              <SectionRow
                title={t("chatbot.create.handoffMessage")}
                value={item.handoffMessage ?? "-"}
              />
              <SectionRow
                title={t("chatbot.create.handoffKeywords")}
                value={
                  item.handoffKeywords?.length
                    ? item.handoffKeywords.join(", ")
                    : "-"
                }
              />
              <SectionRow
                title={t("chatbot.create.handoffFallbackThreshold")}
                value={
                  item.handoffFallbackThreshold != null
                    ? String(item.handoffFallbackThreshold)
                    : "-"
                }
              />
            </Section>
          </Accordion.Content>
        </Accordion.Item>

        {/* Guardrails */}
        <Accordion.Item value="guardrails">
          <Accordion.Header className="px-6 py-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <IconShieldCheckFilled size={16} className="text-ui-fg-subtle" />
              {t("chatbot.create.guardrailSettings")}
            </span>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down !pl-0 !pr-0">
            <Section variant="spaced">
              <SectionRow
                title={
                  <span className="flex items-center gap-1.5">
                    {t("chatbot.create.guardrailEnabled")}
                    <Tooltip content={t("chatbot.create.guardrailEnabledHint")}>
                      <InformationCircle className="text-ui-fg-muted w-3 h-3 cursor-help" />
                    </Tooltip>
                  </span>
                }
                value={
                  <Switch
                    checked={item.guardrailEnabled ?? false}
                    disabled={update.isPending}
                    onCheckedChange={onToggle("guardrailEnabled")}
                  />
                }
              />
              <SectionRow
                title={
                  <span className="flex items-center gap-1.5">
                    {t("chatbot.create.guardrailModelEnabled")}
                    <Tooltip
                      content={t("chatbot.create.guardrailModelEnabledHint")}
                    >
                      <InformationCircle className="text-ui-fg-muted w-3 h-3 cursor-help" />
                    </Tooltip>
                  </span>
                }
                value={
                  <Switch
                    checked={item.guardrailModelEnabled ?? false}
                    disabled={update.isPending || !item.guardrailEnabled}
                    onCheckedChange={onToggle("guardrailModelEnabled")}
                  />
                }
              />
              <SectionRow
                title={
                  <span className="flex items-center gap-1.5">
                    {t("chatbot.create.guardrailCustomInstruction")}
                    <Tooltip
                      content={t(
                        "chatbot.create.guardrailCustomInstructionHint",
                      )}
                    >
                      <InformationCircle className="text-ui-fg-muted w-3 h-3 cursor-help" />
                    </Tooltip>
                  </span>
                }
                value={
                  <Tooltip
                    content={item.guardrailCustomInstruction ?? ""}
                    disabled={!item.guardrailCustomInstruction}
                  >
                    <p className="line-clamp-2 text-sm text-ui-fg-subtle cursor-default">
                      {item.guardrailCustomInstruction ?? "-"}
                    </p>
                  </Tooltip>
                }
              />
              <SectionRow
                title={
                  <span className="flex items-center gap-1.5">
                    {t("chatbot.create.guardrailEscalateOnBlock")}
                    <Tooltip
                      content={t("chatbot.create.guardrailEscalateOnBlockHint")}
                    >
                      <InformationCircle className="text-ui-fg-muted w-3 h-3 cursor-help" />
                    </Tooltip>
                  </span>
                }
                value={
                  <Switch
                    checked={item.guardrailEscalateOnBlock ?? true}
                    disabled={update.isPending || !item.guardrailEnabled}
                    onCheckedChange={onToggle("guardrailEscalateOnBlock")}
                  />
                }
              />
            </Section>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};
