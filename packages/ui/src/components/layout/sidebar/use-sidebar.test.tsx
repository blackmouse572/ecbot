import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useNavigate } from "react-router-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "./sidebar-provider";
import { useSidebar } from "./use-sidebar";

const SidebarState = () => {
  const { desktop, mobile, toggle } = useSidebar();
  return (
    <div>
      <span data-testid="desktop">{String(desktop)}</span>
      <span data-testid="mobile">{String(mobile)}</span>
      <button onClick={() => toggle("desktop")}>toggle-desktop</button>
      <button onClick={() => toggle("mobile")}>toggle-mobile</button>
    </div>
  );
};

const NavigateButton = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>navigate</button>;
};

describe("useSidebar", () => {
  describe("without a SidebarProvider", () => {
    it("throws", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => render(<SidebarState />)).toThrow(
        "useSidebar must be used within a SidebarProvider",
      );

      consoleError.mockRestore();
    });
  });

  describe("toggle", () => {
    it("flips desktop and mobile independently", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <SidebarProvider>
            <SidebarState />
          </SidebarProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("desktop")).toHaveTextContent("true");
      expect(screen.getByTestId("mobile")).toHaveTextContent("false");

      await user.click(screen.getByText("toggle-desktop"));
      expect(screen.getByTestId("desktop")).toHaveTextContent("false");

      await user.click(screen.getByText("toggle-desktop"));
      expect(screen.getByTestId("desktop")).toHaveTextContent("true");

      await user.click(screen.getByText("toggle-mobile"));
      expect(screen.getByTestId("mobile")).toHaveTextContent("true");
    });
  });

  describe("route change", () => {
    it("closes the mobile sidebar when the pathname changes", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/a"]}>
          <SidebarProvider>
            <Routes>
              <Route
                path="/a"
                element={
                  <>
                    <SidebarState />
                    <NavigateButton to="/b" />
                  </>
                }
              />
              <Route
                path="/b"
                element={
                  <>
                    <SidebarState />
                    <NavigateButton to="/a" />
                  </>
                }
              />
            </Routes>
          </SidebarProvider>
        </MemoryRouter>,
      );

      await user.click(screen.getByText("toggle-mobile"));
      expect(screen.getByTestId("mobile")).toHaveTextContent("true");

      await user.click(screen.getByText("navigate"));
      expect(screen.getByTestId("mobile")).toHaveTextContent("false");
    });
  });
});
