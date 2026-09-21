import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TwoColumnPage } from "./two-column-page";

describe("TwoColumnPage", () => {
  it("throws when given fewer than two children", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <TwoColumnPage>
          <div>only child</div>
        </TwoColumnPage>,
      ),
    ).toThrow("TwoColumnPage expects exactly two children");

    consoleError.mockRestore();
  });

  it("throws when given more than two children", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <TwoColumnPage>
          <div>first</div>
          <div>second</div>
          <div>third</div>
        </TwoColumnPage>,
      ),
    ).toThrow("TwoColumnPage expects exactly two children");

    consoleError.mockRestore();
  });

  it("renders the first child in the main column and the second in the sidebar column", () => {
    render(
      <TwoColumnPage>
        <TwoColumnPage.Main>main content</TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>sidebar content</TwoColumnPage.Sidebar>
      </TwoColumnPage>,
    );

    const main = screen.getByText("main content");
    const sidebar = screen.getByText("sidebar content");

    // main and sidebar must sit in separate wrapper columns inside the grid,
    // in that order — not just anywhere before/after each other in the DOM.
    expect(main.parentElement).not.toBe(sidebar.parentElement);
    expect(main.parentElement?.className).toContain("min-w-0");

    const grid = main.parentElement?.parentElement;
    expect(grid?.className).toContain("xl:grid-cols-[minmax(0,_1fr)_440px]");
    expect(grid?.children[0]).toBe(main.parentElement);
    expect(grid?.children[1]).toBe(sidebar.parentElement);

    expect(sidebar.className).toContain("xl:max-w-[440px]");
  });

  const renderWithChildRoute = (hasOutlet?: boolean) => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <TwoColumnPage hasOutlet={hasOutlet}>
              <TwoColumnPage.Main>main content</TwoColumnPage.Main>
              <TwoColumnPage.Sidebar>sidebar content</TwoColumnPage.Sidebar>
            </TwoColumnPage>
          ),
          children: [{ index: true, element: <div>outlet content</div> }],
        },
      ],
      { initialEntries: ["/"] },
    );

    return render(<RouterProvider router={router} />);
  };

  it("renders the outlet by default", () => {
    renderWithChildRoute();

    expect(screen.getByText("outlet content")).toBeInTheDocument();
  });

  it("does not render the outlet when hasOutlet is false", () => {
    renderWithChildRoute(false);

    expect(screen.queryByText("outlet content")).not.toBeInTheDocument();
  });
});
