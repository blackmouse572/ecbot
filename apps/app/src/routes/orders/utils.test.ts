import { describe, expect, it } from "vitest";
import {
  formatAmountInput,
  formatMoney,
  formatOrderedAt,
  itemsSummary,
  orderGroupNames,
  orderedAtLabel,
  parseAmountInput,
  timeOf,
  withDay,
  withTime,
} from "./utils";

describe("itemsSummary", () => {
  it("lists each item with its quantity", () => {
    expect(
      itemsSummary({
        items: [
          { id: "1", name: "Kem", quantity: 2 },
          { id: "2", name: "Serum C", quantity: 1 },
          // SAFETY: itemsSummary reads only the name and quantity.
        ] as never,
      }),
    ).toBe("Kem × 2, Serum C × 1");
  });
});

describe("order utils", () => {
  it("formats đồng the Vietnamese way", () => {
    // Intl puts a no-break space before the sign.
    expect(formatMoney(780000, "VND", "vi")).toMatch(/^780\.000\s₫$/);
    expect(formatAmountInput(345000, "vi")).toBe("345.000");
    expect(formatAmountInput(null, "vi")).toBe("");
  });

  it("reads an amount however it was typed", () => {
    expect(parseAmountInput("345.000")).toBe(345000);
    expect(parseAmountInput("1,500,000đ")).toBe(1500000);
    expect(parseAmountInput("")).toBeNull();
  });

  it("says today and yesterday, then the day", () => {
    const now = new Date(2026, 10, 10, 18, 0);
    expect(
      orderedAtLabel(new Date(2026, 10, 10, 14, 12).toISOString(), "vi", now),
    ).toEqual({
      when: "today",
      time: "14:12",
    });
    expect(
      orderedAtLabel(new Date(2026, 10, 9, 19, 5).toISOString(), "vi", now),
    ).toEqual({
      when: "yesterday",
      time: "19:05",
    });
    expect(
      orderedAtLabel(new Date(2026, 10, 8, 9, 0).toISOString(), "vi", now),
    ).toEqual({
      when: "earlier",
      date: "8/11",
    });
    expect(
      orderedAtLabel(new Date(2025, 9, 12).toISOString(), "vi", now),
    ).toEqual({
      when: "earlier",
      date: "12/10/2025",
    });
  });

  it("writes the order date day first, then the time", () => {
    const value = new Date(2026, 10, 10, 14, 12).toISOString();
    expect(formatOrderedAt(value, "vi")).toBe("10/11/2026, 14:12");
  });

  it("changes the day or the time of the order date alone", () => {
    const at = new Date(2026, 10, 10, 14, 5);
    expect(timeOf(at)).toBe("14:05");
    expect(withDay(at, new Date(2026, 10, 2))).toEqual(
      new Date(2026, 10, 2, 14, 5),
    );
    expect(withTime(at, "09:30")).toEqual(new Date(2026, 10, 10, 9, 30));
  });

  it("lists each group once", () => {
    expect(
      // SAFETY: orderGroupNames reads only productGroupName.
      orderGroupNames({
        items: [
          { productGroupName: "Serum" },
          { productGroupName: null },
          { productGroupName: "Serum" },
          { productGroupName: "Toner" },
        ],
      } as never),
    ).toEqual(["Serum", "Toner"]);
  });
});
