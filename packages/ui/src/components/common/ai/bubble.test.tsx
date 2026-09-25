import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Bubble, BubbleContent } from "./bubble";

describe("BubbleContent", () => {
  it("wraps long unbroken tokens (e.g. a URL) instead of widening the bubble", () => {
    render(
      <Bubble align="end">
        <BubbleContent>long-token</BubbleContent>
      </Bubble>,
    );
    expect(screen.getByText("long-token")).toHaveClass("break-words");
  });
});
