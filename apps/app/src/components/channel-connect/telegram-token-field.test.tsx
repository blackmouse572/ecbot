import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramTokenField } from "./telegram-token-field";

// #161: a shop owner who has never made a Telegram bot needs the BotFather
// steps right next to the token field, in both the builder and accounts flow.
describe("TelegramTokenField", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  const renderField = () =>
    render(<TelegramTokenField value="" onChange={vi.fn()} />);

  it("shows a step-by-step BotFather guide once opened", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByText("How to get a bot token"));

    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(6);
    expect(steps[1].textContent).toContain("/newbot");
    expect(steps[3].textContent).toMatch(/ends in "bot"/);
  });

  it("links to @BotFather in a new tab", () => {
    renderField();

    const link = screen.getByRole("link", { name: "@BotFather" });
    expect(link.getAttribute("href")).toBe("https://t.me/BotFather");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("describes the input with the guide", () => {
    renderField();

    const describedBy = screen
      .getByLabelText("Bot Token")
      .getAttribute("aria-describedby");
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe(
      "How to get a bot token",
    );
  });
});
