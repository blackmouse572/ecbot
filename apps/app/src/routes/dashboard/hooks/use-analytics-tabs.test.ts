import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readable = vi.hoisted(() => ({ subjects: new Set<string>() }));
vi.mock("@repo/auth", () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      action === "read" && readable.subjects.has(subject),
  }),
}));

import { useAnalyticsTabs } from "./use-analytics-tabs";

const tabsFor = (...subjects: string[]) => {
  readable.subjects = new Set(subjects);
  return renderHook(() => useAnalyticsTabs()).result.current;
};

describe("useAnalyticsTabs", () => {
  beforeEach(() => {
    readable.subjects = new Set();
  });

  it("shows every tab to a member who can read everything", () => {
    expect(tabsFor("CUSTOMER", "CONVERSATION", "CHATBOT")).toEqual([
      "conversion",
      "marketing",
      "bot",
      "customers",
    ]);
  });

  it("hides tabs whose numbers the member cannot open", () => {
    expect(tabsFor("CHATBOT")).toEqual(["bot"]);
    // Marketing needs both customers and conversations, not agents.
    expect(tabsFor("CUSTOMER")).toEqual(["conversion", "customers"]);
    expect(tabsFor("CUSTOMER", "CONVERSATION")).toEqual([
      "conversion",
      "marketing",
      "customers",
    ]);
  });

  it("shows nothing without any read permission", () => {
    expect(tabsFor()).toEqual([]);
  });
});
