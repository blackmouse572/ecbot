import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollEdgeBlur } from "./scroll-edge-blur";

describe("ScrollEdgeBlur", () => {
  it("blurs strongest at the edge where content is hidden", () => {
    render(<ScrollEdgeBlur side="left" visible testId="row-shadow-left" />);
    const edge = screen.getByTestId("row-shadow-left");
    const blur = edge.querySelector<HTMLElement>(".backdrop-blur-\\[3px\\]");
    expect(edge).toHaveClass("left-0", "inset-y-0", "opacity-100");
    expect(blur?.style.maskImage).toBe(
      "linear-gradient(to left, transparent, black)",
    );
    expect(edge.querySelector(".bg-gradient-to-r")).not.toBeNull();
  });

  it("sits inside the scroller when asked", () => {
    render(
      <ScrollEdgeBlur
        side="bottom"
        visible={false}
        className="bottom-0 h-6"
        testId="list-shadow-bottom"
      />,
    );
    const edge = screen.getByTestId("list-shadow-bottom");
    expect(edge).toHaveClass("bottom-0", "h-6", "opacity-0");
    expect(edge).not.toHaveClass("bottom-full");
  });
});
