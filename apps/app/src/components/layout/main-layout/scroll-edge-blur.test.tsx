import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollEdgeBlur } from "./scroll-edge-blur";

describe("ScrollEdgeBlur", () => {
  it.each([
    ["top", "to top"],
    ["bottom", "to bottom"],
    ["left", "to left"],
    ["right", "to right"],
  ] as const)(
    "blurs strongest at the %s edge, where content is hidden",
    (side, direction) => {
      render(<ScrollEdgeBlur side={side} visible testId="edge" />);
      const blur = screen
        .getByTestId("edge")
        .querySelector<HTMLElement>("[style]");
      // Compared through the DOM, which writes "to bottom" (the default) as nothing.
      const expected = document.createElement("div").style;
      expected.maskImage = `linear-gradient(${direction}, transparent, black)`;
      expect(blur?.style.maskImage).toBe(expected.maskImage);
    },
  );

  it("lets the caller move it inside the scroller", () => {
    render(
      <ScrollEdgeBlur
        side="bottom"
        visible
        className="bottom-0"
        testId="edge"
      />,
    );
    expect(screen.getByTestId("edge")).not.toHaveClass("bottom-full");
  });
});
