import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { McpActionCost } from "./mcp-action-cost";

// Over 10,000 tokens a message, the cost turns into a warning to switch actions off.
describe("McpActionCost", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("states the cost quietly up to the limit", () => {
    render(<McpActionCost tokens={9_999} />);

    expect(
      screen.getByText("Adds about 9,999 tokens to every message."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("warns once the cost passes the limit", () => {
    render(<McpActionCost tokens={10_001} />);

    expect(screen.getByText(/Adds about 10,001 tokens/).textContent).toContain(
      "Turn off the actions this agent does not need.",
    );
  });

  it("warns in Vietnamese too", async () => {
    await i18n.changeLanguage("vi");
    render(<McpActionCost tokens={10_001} />);

    expect(screen.getByText(/Thêm khoảng 10\.001 token/).textContent).toContain(
      "Hãy tắt các action mà agent này không cần.",
    );
  });
});
