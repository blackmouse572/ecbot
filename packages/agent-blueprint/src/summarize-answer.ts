import { groupOpeningHours, hasOpeningHours, type OpeningHours, type OpeningRange } from "./opening-hours";
import type { CustomAddressStyle } from "./profile";
import type { Question } from "./questions";

/** i18next's `t`, narrowed to what the summary needs, so this package stays free of i18next. */
export type Translate = (key: string) => string;

// "Mon to Fri 08:00-12:00, 13:30-17:30 · Sat 08:00-12:00 · Sun Closed"
function summarizeHours(raw: OpeningHours | undefined, t: Translate): string {
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

/** One builder answer as a line of text, the way the builder and the agent pages show it. */
export function summarizeAnswer(question: Question, raw: unknown, t: Translate): string {
  if (question.kind === "hours") return summarizeHours(raw as OpeningHours | undefined, t);
  if (question.kind === "boolean") return t(raw ? "agentBuilder.ui.yes" : "agentBuilder.ui.no");
  if (question.kind === "text") return String(raw ?? "");
  // A custom address style answers with its two words (#157).
  if (question.id === "addressStyle" && typeof raw === "object" && raw) {
    const { self, customer } = raw as CustomAddressStyle;
    return `${self} / ${customer}`;
  }
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values
    // A value with no choice is the owner's own label (custom collect fields), shown as typed.
    .map((v) => {
      const choice = question.choices?.find((c) => c.value === v);
      return choice ? t(choice.labelKey) : String(v);
    })
    .join(", ");
}
