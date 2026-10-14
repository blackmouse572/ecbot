import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Button, Container, Text } from "@medusajs/ui";
import {
  buildQuestionGroups,
  migrateProfile,
  readAnswer,
  type AgentProfile,
} from "@repo/agent-blueprint";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { SectionRow } from "@repo/ui/common-components";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { CHATBOT_PROFILE_VISIBLE_GROUPS } from "../../constants";
import { summarize } from "../../chatbot-create/agent-builder/components/answer-message";
import { ChatbotSectionEditButton } from "./chatbot-section-edit-button";
import { ChatbotSectionHeader } from "./chatbot-section-header";

type ChatbotProfileSectionProps = { item: ChatbotGetDetailResponseDto };

/**
 * The owner's builder answers, grouped and titled the way the builder asked
 * them. Chatbots made without the builder have none, and the builder would
 * start a new chatbot for them, so the card is left out.
 */
export const ChatbotProfileSection: FC<ChatbotProfileSectionProps> = ({
  item,
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [expanded, setExpanded] = useState(false);

  if (!item.agentProfile) return null;

  // An answer to a question the builder no longer asks shows in the one that
  // replaced it, as it does in the builder (#155).
  const profile = migrateProfile(item.agentProfile as unknown as AgentProfile);
  const groups = buildQuestionGroups(profile)
    .map((group) => ({
      ...group,
      rows: group.questions
        .map((question) => ({
          question,
          answer: summarize(
            question,
            readAnswer(profile, question.path),
            t,
          ).trim(),
        }))
        .filter((row) => row.answer.length > 0),
    }))
    .filter((group) => group.rows.length > 0);
  const hidden = groups.length - CHATBOT_PROFILE_VISIBLE_GROUPS;
  const shown = expanded
    ? groups
    : groups.slice(0, CHATBOT_PROFILE_VISIBLE_GROUPS);

  return (
    <Container className="divide-y p-0">
      <ChatbotSectionHeader
        title={t("chatbot.details.profile.title")}
        description={t("chatbot.details.profile.description")}
        actions={
          <ChatbotSectionEditButton
            to={`/${workspaceSlug}/${ROUTES.Chatbot}/create?chatbotId=${item.id}`}
            label={t("agentBuilder.ui.editWithBuilder")}
          />
        }
      />
      {shown.map((group) => (
        <div key={group.id} className="py-2">
          <Text
            size="xsmall"
            weight="plus"
            className="px-6 pt-2 uppercase tracking-wide text-ui-fg-muted"
          >
            {t(group.titleKey)}
          </Text>
          {group.rows.map(({ question, answer }) => (
            <SectionRow
              key={question.id}
              title={t(question.titleKey)}
              value={
                <Text
                  size="small"
                  leading="compact"
                  className="whitespace-pre-line text-ui-fg-base"
                >
                  {answer}
                </Text>
              }
            />
          ))}
        </div>
      ))}
      {hidden > 0 && (
        <div className="px-6 py-3">
          <Button
            size="small"
            variant="transparent"
            className="text-ui-fg-interactive"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? t("chatbot.details.profile.showLess")
              : t("chatbot.details.profile.showMore", { count: hidden })}
          </Button>
        </div>
      )}
    </Container>
  );
};
