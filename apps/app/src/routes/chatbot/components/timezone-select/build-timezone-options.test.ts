import { describe, expect, it } from "vitest";
import {
  buildTimezoneOptions,
  filterTimezoneOptions,
} from "./build-timezone-options";

// Fixed instant so offsets are stable (no DST in October for these zones
// except London, which is on BST: UTC+01:00).
const NOW = new Date("2026-10-13T12:00:00Z");

describe("buildTimezoneOptions", () => {
  const options = buildTimezoneOptions(NOW);

  it("lists the regional zones first, then every other IANA zone", () => {
    expect(options.slice(0, 3).map((o) => o.value)).toEqual([
      "Asia/Ho_Chi_Minh",
      "Asia/Bangkok",
      "Asia/Jakarta",
    ]);
    expect(options.length).toBeGreaterThan(300);
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
  });

  it("labels each zone with its current UTC offset", () => {
    const london = options.find((o) => o.value === "Europe/London");
    expect(london?.label).toBe("(UTC+01:00) Europe/London");
    expect(options[0].label).toBe("(UTC+07:00) Asia/Ho_Chi_Minh");
  });
});

describe("filterTimezoneOptions", () => {
  const options = buildTimezoneOptions(NOW);

  it("matches city names typed with spaces and any case", () => {
    expect(
      filterTimezoneOptions(options, "ho chi").map((o) => o.value),
    ).toEqual(["Asia/Ho_Chi_Minh"]);
  });

  it("matches an offset", () => {
    expect(
      filterTimezoneOptions(options, "+07:00").map((o) => o.value),
    ).toContain("Asia/Bangkok");
  });

  it("returns everything for an empty search", () => {
    expect(filterTimezoneOptions(options, "  ")).toBe(options);
  });
});
