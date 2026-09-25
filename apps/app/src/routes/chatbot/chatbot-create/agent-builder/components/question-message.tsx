import {
  confidenceLevel, readAnswer, type AgentProfile, type AgentSuggestion, type Question,
} from "@repo/agent-blueprint";
import { Badge } from "@medusajs/ui";
import {
  Message, MessageContent, Questionnaire, QuestionnaireActions, QuestionnaireChoice,
  QuestionnaireChoices, QuestionnaireDescription, QuestionnaireError, QuestionnaireInput,
  QuestionnaireItem, QuestionnaireNext, QuestionnaireProgress, QuestionnaireSkip, QuestionnaireTitle,
} from "@repo/ui/common-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { businessTypeIcon } from "./business-type-icon";

type Props = {
  question: Question;
  profile: AgentProfile;
  suggestion: AgentSuggestion | null;
  position: { current: number; total: number };
  onAnswer: (value: unknown) => void;
  onSkip: () => void;
};

const BOOLEAN_CHOICES = [
  { value: "yes", labelKey: "agentBuilder.ui.yes" },
  { value: "no", labelKey: "agentBuilder.ui.no" },
];

function toFormValue(question: Question, raw: unknown): string | string[] {
  if (question.kind === "multi") return (raw as string[] | undefined) ?? [];
  if (question.kind === "boolean") return raw ? "yes" : "no";
  return String(raw ?? "");
}

function fromFormValue(question: Question, value: string | string[]): unknown {
  if (question.kind === "boolean") return value === "yes";
  if (question.kind === "text") return (value as string).trim();
  return value;
}

function badgeFor(question: Question, suggestion: AgentSuggestion | null): "auto" | "check" | null {
  if (!suggestion) return null;
  const scored =
    question.id === "businessType" ? suggestion.businessType
    : question.id === "personality" ? suggestion.personality
    : question.id === "formality" ? suggestion.formality
    : null;
  if (scored) {
    const level = confidenceLevel(scored.confidence);
    return level === "none" ? null : level;
  }
  return question.id === "goals" || question.id === "rules" ? "check" : null;
}

export function QuestionMessage({ question, profile, suggestion, position, onAnswer, onSkip }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(() => toFormValue(question, readAnswer(profile, question.path)));
  const badge = badgeFor(question, suggestion);
  const choices = question.kind === "boolean" ? BOOLEAN_CHOICES : (question.choices ?? []);

  return (
    <Message from="assistant" variant="outline" className="w-full">
      <MessageContent className="w-full max-w-full">
        <Questionnaire onSubmit={() => onAnswer(fromFormValue(question, value))}>
          <div className="flex items-center justify-between gap-2">
            <QuestionnaireProgress current={position.current} total={position.total} render={(p) => t("agentBuilder.ui.progress", p)} />
            {badge && (
              <Badge size="2xsmall" color={badge === "auto" ? "green" : "orange"}>
                {t(`agentBuilder.ui.${badge}`)}
              </Badge>
            )}
          </div>
          <QuestionnaireItem
            name={question.id}
            value={value}
            onValueChange={setValue}
            multiple={question.kind === "multi"}
            required={question.required}
            max={question.max}
          >
            <QuestionnaireTitle>{t(question.titleKey)}</QuestionnaireTitle>
            {question.descriptionKey && <QuestionnaireDescription>{t(question.descriptionKey)}</QuestionnaireDescription>}
            {question.kind === "text" ? (
              <QuestionnaireInput
                aria-label={t(question.titleKey)}
                placeholder={question.placeholderKey ? t(question.placeholderKey) : undefined}
                multiline={question.multiline}
                maxLength={question.multiline ? 1000 : 120}
              />
            ) : (
              <QuestionnaireChoices shortcuts="numbers">
                {choices.map((c) => (
                  <QuestionnaireChoice
                    key={c.value}
                    value={c.value}
                    label={t(c.labelKey)}
                    icon={question.id === "businessType" ? businessTypeIcon(c.value) : undefined}
                  />
                ))}
              </QuestionnaireChoices>
            )}
            <QuestionnaireError>{t("agentBuilder.ui.required")}</QuestionnaireError>
          </QuestionnaireItem>
          <QuestionnaireActions>
            {!question.required && <QuestionnaireSkip onClick={onSkip}>{t("actions.skip")}</QuestionnaireSkip>}
            <QuestionnaireNext>{t("actions.next")}</QuestionnaireNext>
          </QuestionnaireActions>
        </Questionnaire>
      </MessageContent>
    </Message>
  );
}
