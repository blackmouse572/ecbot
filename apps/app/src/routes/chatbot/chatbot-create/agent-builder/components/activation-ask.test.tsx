import { createProfile, type AgentProfile } from "@repo/agent-blueprint";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { initialBuilderState } from "../builder-state";
import type { AgentBuilderController } from "../use-agent-builder";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

import { ActivationAsk } from "./activation-ask";

const renderAsk = (profile: AgentProfile) =>
  render(
    <ActivationAsk
      {...({
        state: { ...initialBuilderState, profile, chatbotId: "c1" },
        dispatch: vi.fn(),
        finish: vi.fn(),
        finishing: false,
      } as unknown as AgentBuilderController)}
    />,
  );

// Agent v2: the builder no longer asks how the agent talks, so the last
// step says which defaults it uses before the owner turns it on.
describe("ActivationAsk", () => {
  it("lists the defaults a Vietnamese shop starts with", () => {
    renderAsk(createProfile("beauty", "vi"));

    expect(
      screen.getByText("agentBuilder.ui.defaultsIntro"),
    ).toBeInTheDocument();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "agentBuilder.ui.defaults.addressStyle: agentBuilder.addressStyle.em_anhchi",
      expect.stringMatching(/^agentBuilder\.ui\.defaults\.replyLength: /),
      expect.stringMatching(/^agentBuilder\.ui\.defaults\.handoffWhen: /),
      expect.stringMatching(/^agentBuilder\.ui\.defaults\.afterHours: /),
    ]);
  });

  it("leaves out how to address customers in English", () => {
    renderAsk(createProfile("beauty", "en"));

    expect(
      screen
        .getAllByRole("listitem")
        .some((li) => li.textContent?.includes("defaults.addressStyle")),
    ).toBe(false);
  });

  it("offers to activate now or later", () => {
    renderAsk(createProfile("beauty", "vi"));

    expect(screen.getByText("agentBuilder.ui.activateAsk")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "agentBuilder.ui.activateNow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "agentBuilder.ui.activateLater" }),
    ).toBeInTheDocument();
  });
});
