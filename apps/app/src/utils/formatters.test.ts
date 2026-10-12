import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./formatters";

const now = Date.parse("2026-10-11T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("says now for something that just happened", () => {
    expect(formatRelativeTime("2026-10-11T11:59:40.000Z", "en", now)).toBe(
      "now",
    );
  });

  it("uses the largest whole unit", () => {
    expect(formatRelativeTime("2026-10-11T11:55:00.000Z", "en", now)).toBe(
      "5 minutes ago",
    );
    expect(formatRelativeTime("2026-10-11T09:00:00.000Z", "en", now)).toBe(
      "3 hours ago",
    );
    expect(formatRelativeTime("2026-10-10T12:00:00.000Z", "en", now)).toBe(
      "yesterday",
    );
  });

  it("speaks the user's language", () => {
    expect(formatRelativeTime("2026-10-11T11:55:00.000Z", "vi", now)).toBe(
      "5 phút trước",
    );
  });
});
