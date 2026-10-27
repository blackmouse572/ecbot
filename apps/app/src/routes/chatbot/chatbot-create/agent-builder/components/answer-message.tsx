import { readAnswer, summarizeAnswer, type AgentProfile, type Question } from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { IconPencil } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function AnswerMessage({ question, profile, onEdit }: { question: Question; profile: AgentProfile; onEdit: () => void }) {
  const { t } = useTranslation();
  const summary = summarizeAnswer(question, readAnswer(profile, question.path), t) || t("agentBuilder.ui.skipped");
  // "{lead} {summary}", e.g. "My business type is: Spa" (wireframe delta section 2).
  const lead = t(question.leadKey);
  return (
    <Message from="user">
      <MessageContent
        render={<button type="button" onClick={onEdit} title={t("actions.edit")} className="group text-left" />}
      >
        <span className="flex items-center gap-2">
          {lead} {summary}
          <IconPencil size={14} className="shrink-0 opacity-50 group-hover:opacity-100" />
        </span>
      </MessageContent>
    </Message>
  );
}
