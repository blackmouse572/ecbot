import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollArea } from "./scroll-area";

const viewport = () => screen.getByText("content").closest('[data-slot="scroll-area-viewport"]');

describe("ScrollArea", () => {
  it("adds viewportClassName to the viewport", () => {
    render(<ScrollArea viewportClassName="[&>div]:!h-full">content</ScrollArea>);
    expect(viewport()).toHaveClass("[&>div]:!h-full");
  });

  it("leaves the viewport classes unchanged without viewportClassName", () => {
    render(<ScrollArea>content</ScrollArea>);
    expect(viewport()).not.toHaveClass("[&>div]:!h-full");
    expect(viewport()).toHaveClass("h-full");
  });
});
