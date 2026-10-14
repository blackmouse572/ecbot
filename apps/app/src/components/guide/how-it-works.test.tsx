import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./how-it-works";

describe("HowItWorks", () => {
  it("explains the page with an example exchange", () => {
    render(<HowItWorks feature="knowledge" icon={<span />} />);

    fireEvent.click(screen.getByRole("button", { name: "How it works" }));

    expect(
      screen.getByText("Teach the agent about your shop"),
    ).toBeInTheDocument();
    expect(screen.getByText("What time do you open?")).toBeInTheDocument();
  });
});
