import { describe, expect, it } from "vitest";
import { describeOpeningHours, groupOpeningHours, hasOpeningHours, openingHoursSchema } from "./opening-hours";

const lunchBreak = [{ open: "08:00", close: "12:00" }, { open: "13:30", close: "17:30" }];

describe("openingHoursSchema", () => {
  it("accepts a lunch break, a closed day and a midnight close", () => {
    const hours = { mon: lunchBreak, sun: [], sat: [{ open: "18:00", close: "24:00" }] };
    expect(openingHoursSchema.parse(hours)).toEqual(hours);
  });

  it.each([
    ["a close before the open", [{ open: "12:00", close: "08:00" }]],
    ["an empty range", [{ open: "08:00", close: "08:00" }]],
    ["overlapping ranges", [{ open: "08:00", close: "12:00" }, { open: "11:00", close: "14:00" }]],
    ["a malformed time", [{ open: "8h", close: "12:00" }]],
    ["an open at 24:00", [{ open: "24:00", close: "24:00" }]],
    ["more than three ranges", [
      { open: "01:00", close: "02:00" }, { open: "03:00", close: "04:00" },
      { open: "05:00", close: "06:00" }, { open: "07:00", close: "08:00" },
    ]],
  ])("rejects %s", (_, ranges) => {
    expect(openingHoursSchema.safeParse({ mon: ranges }).success).toBe(false);
  });

  it("accepts ranges that touch but do not overlap, in any order", () => {
    const touching = [{ open: "12:00", close: "17:00" }, { open: "08:00", close: "12:00" }];
    expect(openingHoursSchema.safeParse({ mon: touching }).success).toBe(true);
  });
});

describe("hasOpeningHours", () => {
  it("is false when no day has a range", () => {
    expect(hasOpeningHours(undefined)).toBe(false);
    expect(hasOpeningHours({})).toBe(false);
    expect(hasOpeningHours({ mon: [], tue: [] })).toBe(false);
    expect(hasOpeningHours({ tue: lunchBreak })).toBe(true);
  });
});

describe("describeOpeningHours", () => {
  it("groups consecutive days with the same ranges and names closed days", () => {
    const weekdays = { mon: lunchBreak, tue: lunchBreak, wed: lunchBreak, thu: lunchBreak, fri: lunchBreak };
    expect(describeOpeningHours({ ...weekdays, sat: [{ open: "08:00", close: "12:00" }] })).toBe(
      "Monday to Friday 08:00-12:00 and 13:30-17:30; Saturday 08:00-12:00; Sunday closed",
    );
  });

  it("lists days that only look alike apart, and sorts ranges", () => {
    const morning = [{ open: "08:00", close: "12:00" }];
    expect(describeOpeningHours({ mon: morning, wed: [...lunchBreak].reverse() })).toBe(
      "Monday 08:00-12:00; Tuesday closed; Wednesday 08:00-12:00 and 13:30-17:30; Thursday to Sunday closed",
    );
  });

  it("says every day when the whole week matches", () => {
    const allDay = [{ open: "00:00", close: "24:00" }];
    const week = Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, allDay]));
    expect(describeOpeningHours(week)).toBe("Every day 00:00-24:00");
  });
});

describe("groupOpeningHours", () => {
  it("returns closed runs with no ranges", () => {
    expect(groupOpeningHours({ sat: lunchBreak })).toEqual([
      { from: "mon", to: "fri", ranges: [] },
      { from: "sat", to: "sat", ranges: lunchBreak },
      { from: "sun", to: "sun", ranges: [] },
    ]);
  });
});
