import { render } from "@testing-library/react";
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
    const { container } = render(<ListSkeleton rowCount={4} />);
    expect(count(container, "list-skeleton-row")).toBe(4);
  });
});

describe("FormSkeleton", () => {
  it("draws the requested number of fields", () => {
    const { container } = render(<FormSkeleton fieldCount={2} />);
    expect(count(container, "form-skeleton-field")).toBe(2);
  });
});
