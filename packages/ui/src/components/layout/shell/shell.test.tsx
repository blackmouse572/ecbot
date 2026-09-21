import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "../sidebar";
import { Shell } from "./shell";

const mobileNavLabels = {
  title: "Navigation",
  description: "Navigate through the application.",
};

const renderShell = (topbarActions?: React.ReactNode) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <SidebarProvider>
            <Shell
              mobileNavLabels={mobileNavLabels}
              topbarActions={topbarActions}
            >
              <div>sidebar content</div>
            </Shell>
          </SidebarProvider>
        ),
        children: [
          {
            path: "channels",
            handle: { breadcrumb: () => "Channels" },
            children: [
              {
                path: ":id",
                handle: { breadcrumb: () => "Acme Corp" },
                element: <div>Account detail</div>,
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: ["/channels/acme"] },
  );

  return render(<RouterProvider router={router} />);
};

const getDesktopToggleButton = () =>
  screen
    .getAllByRole("button")
    .find(
      (btn) =>
        btn.className.includes("lg:flex") &&
        !btn.className.includes("max-lg:flex"),
    )!;

const getMobileToggleButton = () =>
  screen
    .getAllByRole("button")
    .find((btn) => btn.className.includes("max-lg:flex"))!;

const getDesktopRail = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("div")).find((el) =>
    el.className.includes("w-[220px]"),
  )!;

describe("Shell", () => {
  it("renders breadcrumbs in order, with only the last one non-linked", () => {
    renderShell();

    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Channels");
    expect(items[1]).toHaveTextContent("Acme Corp");

    const link = within(items[0]!).getByRole("link", { name: "Channels" });
    expect(link).toHaveAttribute("href", "/channels");

    expect(within(items[1]!).queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders topbarActions in the topbar", () => {
    renderShell(<button>Notifications</button>);

    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("gives the desktop rail a fixed width of 220px", () => {
    const { container } = renderShell();

    const rail = getDesktopRail(container);
    expect(rail.className).toContain("w-[220px]");
  });

  it("hides the desktop rail after toggling it closed", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    const rail = getDesktopRail(container);
    expect(rail.className).toContain("lg:flex");

    await user.click(getDesktopToggleButton());

    expect(rail.className).not.toContain("lg:flex");
  });

  it("uses mobileNavLabels for the mobile drawer's sr-only Dialog.Title/Description", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(getMobileToggleButton());

    expect(screen.getByText(mobileNavLabels.title)).toBeInTheDocument();
    expect(screen.getByText(mobileNavLabels.description)).toBeInTheDocument();
  });

  it("dims the main content while a route is loading", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <SidebarProvider>
              <Shell mobileNavLabels={mobileNavLabels}>
                <div>sidebar content</div>
              </Shell>
            </SidebarProvider>
          ),
          children: [
            { index: true, element: <Link to="/slow">Go</Link> },
            {
              path: "slow",
              loader: () => new Promise(() => {}),
              element: <div>Slow page</div>,
            },
          ],
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    const main = screen.getByRole("main");
    expect(main.className).not.toContain("opacity-25");

    await user.click(screen.getByRole("link", { name: "Go" }));

    expect(main.className).toContain("opacity-25");
  });

  it("keeps rendering the other breadcrumbs when one handle.breadcrumb throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <SidebarProvider>
              <Shell mobileNavLabels={mobileNavLabels}>
                <div>sidebar content</div>
              </Shell>
            </SidebarProvider>
          ),
          children: [
            {
              path: "channels",
              handle: { breadcrumb: () => "Channels" },
              children: [
                {
                  path: "broken",
                  handle: {
                    breadcrumb: () => {
                      throw new Error("boom");
                    },
                  },
                  children: [
                    {
                      path: ":id",
                      handle: { breadcrumb: () => "Acme Corp" },
                      element: <div>Account detail</div>,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ["/channels/broken/acme"] },
    );

    render(<RouterProvider router={router} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Channels");
    expect(items[1]).toHaveTextContent("Acme Corp");

    consoleError.mockRestore();
  });

  it("renders children in both the mobile drawer and the desktop rail once the drawer opens", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <SidebarProvider>
              <Shell mobileNavLabels={mobileNavLabels}>
                <div>sidebar marker</div>
              </Shell>
            </SidebarProvider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getAllByText("sidebar marker")).toHaveLength(1);

    await user.click(getMobileToggleButton());

    expect(screen.getAllByText("sidebar marker")).toHaveLength(2);
  });
});
