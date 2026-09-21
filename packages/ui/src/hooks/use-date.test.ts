import { renderHook } from "@testing-library/react";
import type { i18n as I18n } from "i18next";
import { createElement, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createTestI18n } from "../../test/i18n";
import { useDate } from "./use-date";

// Local-time construction: `PP`/`PPpp` format in the runner's timezone, so a
// UTC literal would shift the day in some zones and make assertions flaky.
const JULY_7 = new Date(2026, 6, 7, 10, 0, 0);

function renderUseDate(lng: string) {
  const i18n = createTestI18n("en");
  i18n.changeLanguage(lng);

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(I18nextProvider, { i18n: i18n as I18n }, children);

  return renderHook(() => useDate(), { wrapper });
}

describe("useDate", () => {
  it("formats with the locale matching the active language", () => {
    const en = renderUseDate("en").result.current.getFullDate(JULY_7);
    const vi = renderUseDate("vi").result.current.getFullDate(JULY_7);

    expect(en).toBe("Jul 7, 2026");
    expect(vi).not.toBe(en);
  });

  it("includes the time only when asked", () => {
    const { result } = renderUseDate("en");

    const dateOnly = result.current.getFullDate(JULY_7);
    const withTime = result.current.getFullDate({
      date: JULY_7,
      includeTime: true,
    });

    expect(withTime).not.toBe(dateOnly);
    expect(withTime).toContain(dateOnly);
  });

  it("falls back to the platform format for an unmapped language", () => {
    // A consumer app may ship a language @repo/ui has no date-fns locale for.
    // That must degrade, not throw.
    const { result } = renderUseDate("fr");

    expect(result.current.getFullDate(JULY_7)).toBe(
      JULY_7.toLocaleDateString(),
    );
  });

  it("switches from a relative to an absolute date past maxTime", () => {
    const { result } = renderUseDate("en");

    const recent = new Date(Date.now() - 60 * 1000);
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);

    expect(result.current.getRelativeDateOrFullDate(recent)).toContain(
      "minute",
    );
    expect(result.current.getRelativeDateOrFullDate(old)).toBe(
      result.current.getFullDate(old),
    );
  });
});
