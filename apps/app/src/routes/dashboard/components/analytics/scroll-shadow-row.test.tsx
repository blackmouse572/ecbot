import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollShadowRow } from "./scroll-shadow-row";

describe("ScrollShadowRow", () => {
  // Its z-10 blur bands must stay inside the row: a modal portaled to <body>
  // has no z-index, so they would otherwise paint over it.
  it("keeps its blur bands below modals opened over the page", () => {
    render(<ScrollShadowRow>row</ScrollShadowRow>);

    const row = screen.getByTestId("row-shadow-left").parentElement;
    expect(row).toHaveClass("isolate");
  });
});
