import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IssuedPanel } from "./issued-panel";

describe("IssuedPanel", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("does not warn to keep a website widget key safe, since it is public", () => {
    render(
      <IssuedPanel
        issued={{ kind: "WEBSITE_WIDGET", widgetKey: "wk_1" } as never}
        onDone={vi.fn()}
      />,
    );
    expect(screen.queryByText(/somewhere safe/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Paste this code into your website to show the chat. The key is public, so there is nothing to keep secret.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the colour, label and theme options in the embed snippet", () => {
    render(
      <IssuedPanel
        issued={{ kind: "WEBSITE_WIDGET", widgetKey: "wk_1" } as never}
        onDone={vi.fn()}
      />,
    );
    const snippet = (
      screen.getByDisplayValue(/widget\.js/) as HTMLTextAreaElement
    ).value;
    expect(snippet).toContain('data-widget-key="wk_1"');
    expect(snippet).toContain('data-color="#0f766e"');
    expect(snippet).toContain('data-label="Chat"');
    expect(snippet).toContain('data-theme="light"');
    expect(screen.getByText(/change data-color/)).toBeTruthy();
  });

  it("still warns to keep API channel credentials safe", () => {
    render(
      <IssuedPanel
        issued={
          { kind: "API_CHANNEL", accountKey: "ak", signingSecret: "s" } as never
        }
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText(/somewhere safe/)).toBeInTheDocument();
  });

  it("says kênh, not channel, in Vietnamese", async () => {
    await i18n.changeLanguage("vi");
    render(
      <IssuedPanel
        issued={{ kind: "WEBSITE_WIDGET", widgetKey: "wk_1" } as never}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText("Đã tạo kênh")).toBeInTheDocument();
  });

  // #255: a channel made from the Accounts page has no agent yet, so it
  // cannot answer until the owner attaches one.
  it("says an agent must be attached when the channel has none", () => {
    render(
      <IssuedPanel
        issued={{ kind: "WEBSITE_WIDGET", widgetKey: "wk_1" } as never}
        needsAgent
        onDone={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/answers once an agent is attached/),
    ).toBeInTheDocument();
  });

  it("does not ask for an agent the channel already has", () => {
    render(
      <IssuedPanel
        issued={{ kind: "WEBSITE_WIDGET", widgetKey: "wk_1" } as never}
        onDone={vi.fn()}
      />,
    );
    expect(
      screen.queryByText(/answers once an agent is attached/),
    ).not.toBeInTheDocument();
  });
});
