import { describe, expect, it } from "vitest";
import { fromOpeningWeek, toOpeningWeek } from "./opening-hours-form";

const closed = toOpeningWeek(undefined);

describe("opening hours form", () => {
  it("edits a midnight close as 00:00 and stores it as 24:00", () => {
    const week = toOpeningWeek({ fri: [{ open: "18:00", close: "24:00" }] });
    expect(week.fri).toEqual([{ open: "18:00", close: "00:00" }]);
    expect(fromOpeningWeek(week)?.fri).toEqual([{ open: "18:00", close: "24:00" }]);
  });

  it("stores nothing for a week with no open day", () => {
    expect(fromOpeningWeek(closed)).toBeUndefined();
  });

  it("refuses overlapping or backwards ranges", () => {
    expect(fromOpeningWeek({ ...closed, mon: [{ open: "12:00", close: "08:00" }] })).toBeNull();
    expect(fromOpeningWeek({
      ...closed,
      mon: [{ open: "08:00", close: "12:00" }, { open: "11:00", close: "13:00" }],
    })).toBeNull();
  });
});
