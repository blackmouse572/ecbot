import {
  WEEKDAYS, hasOpeningHours, openingHoursSchema, type OpeningHours, type OpeningRange, type Weekday,
} from "@repo/agent-blueprint";

/** The editor's working copy: every weekday present, an empty list means closed. */
export type OpeningWeek = Record<Weekday, OpeningRange[]>;

export const DEFAULT_RANGE: OpeningRange = { open: "08:00", close: "17:00" };

// A time input cannot show 24:00, so a midnight close is edited as 00:00.
export function toOpeningWeek(hours: OpeningHours | undefined): OpeningWeek {
  return Object.fromEntries(
    WEEKDAYS.map((d) => [d, (hours?.[d] ?? []).map((r) => ({ ...r, close: r.close === "24:00" ? "00:00" : r.close }))]),
  ) as OpeningWeek;
}

/** The hours to store, `undefined` for a week with no open day, or `null` when a range is invalid. */
export function fromOpeningWeek(week: OpeningWeek): OpeningHours | undefined | null {
  const hours = Object.fromEntries(
    WEEKDAYS.map((d) => [d, week[d].map((r) => ({ ...r, close: r.close === "00:00" ? "24:00" : r.close }))]),
  );
  const parsed = openingHoursSchema.safeParse(hours);
  if (!parsed.success) return null;
  return hasOpeningHours(parsed.data) ? parsed.data : undefined;
}
