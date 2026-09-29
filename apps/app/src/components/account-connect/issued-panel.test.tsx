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
});
