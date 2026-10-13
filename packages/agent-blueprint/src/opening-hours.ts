import { z } from "zod";

// Structured weekly opening hours (#289), read in the agent's timezone.
// apps/ai reads the same shape from agent_profile to tell the agent on every
// turn whether the business is open right now (opening_hours.py).
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export const MAX_RANGES_PER_DAY = 3;

// Same-day ranges only. "24:00" closes at midnight, so it is valid only as a close.
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const rangeSchema = z
  .object({ open: time, close: z.union([time, z.literal("24:00")]) })
  .strict()
  .refine((r) => r.open < r.close, { message: "close must be after open" });
export type OpeningRange = z.infer<typeof rangeSchema>;

const sorted = (ranges: readonly OpeningRange[]) => [...ranges].sort((a, b) => a.open.localeCompare(b.open));

const daySchema = z
  .array(rangeSchema)
  .max(MAX_RANGES_PER_DAY)
  .refine((ranges) => sorted(ranges).every((r, i, all) => i === 0 || all[i - 1]!.close <= r.open), {
    message: "ranges must not overlap",
  });

export const openingHoursSchema = z.partialRecord(z.enum(WEEKDAYS), daySchema);
export type OpeningHours = z.infer<typeof openingHoursSchema>;

/** A week with no range at all counts as not set: nobody is closed every day. */
export function hasOpeningHours(hours: OpeningHours | undefined): hours is OpeningHours {
  return !!hours && WEEKDAYS.some((d) => (hours[d]?.length ?? 0) > 0);
}

function describeDay(ranges: readonly OpeningRange[] | undefined): string {
  if (!ranges?.length) return "closed";
  return sorted(ranges).map((r) => `${r.open}-${r.close}`).join(" and ");
}

export type OpeningHoursRun = { from: Weekday; to: Weekday; ranges: OpeningRange[] };

/** Consecutive weekdays with the same ranges, Monday first. An empty `ranges` is a closed run. */
export function groupOpeningHours(hours: OpeningHours): OpeningHoursRun[] {
  const key = (d: Weekday) => describeDay(hours[d]);
  const runs: OpeningHoursRun[] = [];
  for (const day of WEEKDAYS) {
    const last = runs[runs.length - 1];
    if (last && key(last.to) === key(day)) last.to = day;
    else runs.push({ from: day, to: day, ranges: sorted(hours[day] ?? []) });
  }
  return runs;
}

/** "Monday to Friday 08:00-12:00 and 13:30-17:30; Saturday 08:00-12:00; Sunday closed" */
export function describeOpeningHours(hours: OpeningHours): string {
  const runs = groupOpeningHours(hours);
  if (runs.length === 1) return `Every day ${describeDay(runs[0]!.ranges)}`;
  return runs
    .map((r) => `${WEEKDAY_NAMES[r.from]}${r.from === r.to ? "" : ` to ${WEEKDAY_NAMES[r.to]}`} ${describeDay(r.ranges)}`)
    .join("; ");
}
