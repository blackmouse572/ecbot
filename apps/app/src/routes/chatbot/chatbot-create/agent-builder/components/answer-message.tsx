import {
  groupOpeningHours, hasOpeningHours, readAnswer, type AgentProfile, type OpeningHours, type OpeningRange, type Question,
} from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { IconPencil } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

// "Mon to Fri 08:00-12:00, 13:30-17:30 · Sat 08:00-12:00 · Sun Closed"
function summarizeHours(raw: OpeningHours | undefined, t: TFunction): string {
  if (!hasOpeningHours(raw)) return "";
  const runs = groupOpeningHours(raw);
  const hours = (ranges: OpeningRange[]) =>
    ranges.length ? ranges.map((r) => `${r.open}-${r.close}`).join(", ") : t("agentBuilder.ui.hoursClosed");
  if (runs.length === 1) return `${t("agentBuilder.ui.hoursEveryDay")} ${hours(runs[0]!.ranges)}`;
  const day = (d: string) => t(`agentBuilder.weekdaysShort.${d}`);
  return runs
    .map((r) => `${day(r.from)}${r.from === r.to ? "" : `-${day(r.to)}`} ${hours(r.ranges)}`)
    .join(" · ");
}

export function summarize(question: Question, raw: unknown, t: TFunction): string {
  if (question.kind === "hours") return summarizeHours(raw as OpeningHours | undefined, t);
  if (question.kind === "boolean") return t(raw ? "agentBuilder.ui.yes" : "agentBuilder.ui.no");
  if (question.kind === "text") return String(raw ?? "");
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values
    // A value with no choice is the owner's own label (custom collect fields), shown as typed.
    .map((v) => {
      const choice = question.choices?.find((c) => c.value === v);
      return choice ? t(choice.labelKey) : String(v);
    })
    .join(", ");
}

export function AnswerMessage({ question, profile, onEdit }: { question: Question; profile: AgentProfile; onEdit: () => void }) {
  const { t } = useTranslation();
  const summary = summarize(question, readAnswer(profile, question.path), t) || t("agentBuilder.ui.skipped");
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
