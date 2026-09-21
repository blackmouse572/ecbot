import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SingleColumnPage } from "./single-column-page";

const renderWithChildRoute = (hasOutlet?: boolean) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <SingleColumnPage hasOutlet={hasOutlet}>
            <div>page content</div>
          </SingleColumnPage>
        ),
        children: [{ index: true, element: <div>outlet content</div> }],
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
};

describe("SingleColumnPage", () => {
  it("renders the outlet by default", () => {
    renderWithChildRoute();

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByText("outlet content")).toBeInTheDocument();
  });

  it("does not render the outlet when hasOutlet is false", () => {
    renderWithChildRoute(false);

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.queryByText("outlet content")).not.toBeInTheDocument();
  });
});
