import { readAnswer, type AgentProfile, type Question } from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { IconPencil } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

export function summarize(question: Question, raw: unknown, t: TFunction): string {
  if (question.kind === "boolean") return t(raw ? "agentBuilder.ui.yes" : "agentBuilder.ui.no");
  if (question.kind === "text") return String(raw ?? "");
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values
    .map((v) => t(question.choices?.find((c) => c.value === v)?.labelKey ?? String(v)))
    .join(", ");
}

export function AnswerMessage({ question, profile, onEdit }: { question: Question; profile: AgentProfile; onEdit: () => void }) {
  const { t } = useTranslation();
  const summary = summarize(question, readAnswer(profile, question.path), t) || t("agentBuilder.ui.skipped");
  return (
    <Message from="user">
      <MessageContent
        render={<button type="button" onClick={onEdit} title={t("agentBuilder.ui.editAnswer")} className="group text-left" />}
      >
        <span className="flex items-center gap-2">
          {summary}
          <IconPencil size={14} className="shrink-0 opacity-50 group-hover:opacity-100" />
        </span>
      </MessageContent>
    </Message>
  );
}
