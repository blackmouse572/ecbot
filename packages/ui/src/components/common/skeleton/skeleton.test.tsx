import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FormSkeleton,
  ListSkeleton,
  SingleColumnPageSkeleton,
  TwoColumnPageSkeleton,
} from "./skeleton";

const count = (container: HTMLElement, slot: string) =>
  container.querySelectorAll(`[data-slot="${slot}"]`).length;

describe("page skeletons", () => {
  it("draws one section card per single column section", () => {
    const { container } = render(<SingleColumnPageSkeleton sections={3} />);
    expect(count(container, "section-skeleton")).toBe(3);
  });

  it("draws main and sidebar section cards on two column pages", () => {
    const { container } = render(
      <TwoColumnPageSkeleton
        mainSections={2}
        sidebarSections={1}
        showMetadata={false}
      />,
    );
    expect(count(container, "section-skeleton")).toBe(3);
  });
});

describe("ListSkeleton", () => {
  it("draws the requested number of rows", () => {
    const { container } = render(<ListSkeleton label="Loading" rowCount={4} />);
    expect(count(container, "list-skeleton-row")).toBe(4);
  });

  it("announces its label to screen readers", () => {
    render(<ListSkeleton label="Loading tools" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading tools");
  });
});

describe("FormSkeleton", () => {
  it("draws the requested number of fields", () => {
    const { container } = render(
      <FormSkeleton label="Loading" fieldCount={2} />,
    );
    expect(count(container, "form-skeleton-field")).toBe(2);
  });

  it("announces its label to screen readers", () => {
    render(<FormSkeleton label="Loading skill" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading skill");
  });
});
