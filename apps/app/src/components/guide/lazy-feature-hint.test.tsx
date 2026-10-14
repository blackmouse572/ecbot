import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LazyFeatureHint } from "./lazy-feature-hint";

describe("LazyFeatureHint", () => {
  it("loads the hint with an example exchange", async () => {
    render(<LazyFeatureHint feature="knowledge" icon={<span />} />);

    expect(
      await screen.findByText("Teach the agent about your shop"),
    ).toBeInTheDocument();
    expect(screen.getByText("What time do you open?")).toBeInTheDocument();
  });
});
