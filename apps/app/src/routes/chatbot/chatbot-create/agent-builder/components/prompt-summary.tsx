import { buildQuestionGroups, readAnswer, type AgentProfile } from "@repo/agent-blueprint";
import { Button, Heading, Text } from "@medusajs/ui";
import { MessageResponse } from "@repo/ui/common-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { summarize } from "./answer-message";

type Props = {
  profile: AgentProfile;
  extraInstructions: string;
  /** The compiled prompt the model reads, in English. */
  prompt: string;
};

/**
 * What the agent was told, in the owner's language: their answers by group.
 * The compiled English prompt stays one click away for those who want it (#159).
 */
export function PromptSummary({ profile, extraInstructions, prompt }: Props) {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const extra = extraInstructions.trim();

  return (
    <div className="flex flex-col gap-y-4">
      <Text size="small" className="text-ui-fg-subtle">
        {t("agentBuilder.ui.promptSummaryIntro")}
      </Text>
      {buildQuestionGroups(profile).map((group) => {
        const rows = group.questions
          .map((question) => ({ question, answer: summarize(question, readAnswer(profile, question.path), t).trim() }))
          .filter((row) => row.answer.length > 0);
        if (rows.length === 0) return null;
        return (
          <section key={group.id} className="flex flex-col gap-y-2">
            <Heading level="h3">{t(group.titleKey)}</Heading>
            <dl className="flex flex-col gap-y-2">
              {rows.map(({ question, answer }) => (
                <div key={question.id}>
                  <dt>
                    <Text size="small" weight="plus">
                      {t(question.titleKey)}
                    </Text>
                  </dt>
                  <dd>
                    <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
                      {answer}
                    </Text>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      {extra && (
        <section className="flex flex-col gap-y-2">
          <Heading level="h3">{t("agentBuilder.ui.extraInstructions")}</Heading>
          <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
            {extra}
          </Text>
        </section>
      )}
      <div className="flex flex-col gap-y-2">
        <Button
          type="button"
          size="small"
          variant="secondary"
          className="self-start"
          aria-expanded={showPrompt}
          onClick={() => setShowPrompt((v) => !v)}
        >
          {showPrompt ? t("agentBuilder.ui.hideFullPrompt") : t("agentBuilder.ui.showFullPrompt")}
        </Button>
        {showPrompt && <MessageResponse>{prompt}</MessageResponse>}
      </div>
    </div>
  );
}
