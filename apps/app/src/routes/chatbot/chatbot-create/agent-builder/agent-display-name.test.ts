import { createProfile } from "@repo/agent-blueprint";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { agentDisplayName } from "./agent-display-name";

// A minimal real-interpolating `t`, standing in for react-i18next's, so the
// fallback text ("your agent") is actually observable rather than a raw key.
const t = ((key: string) => (key === "agentBuilder.ui.yourAgent" ? "your agent" : key)) as TFunction;

describe("agentDisplayName", () => {
  it("uses the agent's own name once it is set", () => {
    const profile = { ...createProfile("beauty", "en"), agentName: "Linh" };
    expect(agentDisplayName(profile, t)).toBe("Linh");
  });

  it("trims the agent name", () => {
    const profile = { ...createProfile("beauty", "en"), agentName: "  Linh  " };
    expect(agentDisplayName(profile, t)).toBe("Linh");
  });

  it("falls back to yourAgent when the agent has no name yet", () => {
    const profile = { ...createProfile("beauty", "en"), agentName: "" };
    expect(agentDisplayName(profile, t)).toBe("your agent");
  });

  it("falls back to yourAgent when there is no profile yet", () => {
    expect(agentDisplayName(null, t)).toBe("your agent");
  });
});
