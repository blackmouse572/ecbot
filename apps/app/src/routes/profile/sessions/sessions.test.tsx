import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// jsdom has no Element.scroll; _DataTable calls it to reset scroll on page change.
Element.prototype.scroll = vi.fn();

vi.mock("@/hooks/api", () => ({
  useSessions: vi.fn(),
  useRevokeSession: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import { useSessions } from "@/hooks/api";
import { SessionsTable } from "./components";

const session = (over: Partial<A> = {}): A => ({
  id: "s1",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  user: "u1",
  expiredAt: "2026-09-01T10:00:00.000Z",
  status: "ACTIVE",
  ip: "1.2.3.4",
  hostname: "app.eccho.io",
  protocol: "https",
  originalUrl: "/api/v1/shared/session/list",
  method: "GET",
  userAgent: "Chrome on macOS",
  country: "VN",
  lastActiveAt: "2026-08-02T10:00:00.000Z",
  ...over,
});

const renderTable = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <SessionsTable />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe("SessionsTable", () => {
  it("renders a session row with its device, ip and status", () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [session()],
      count: 1,
      isLoading: false,
      isError: false,
    } as A);

    renderTable();

    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    expect(screen.getByText("1.2.3.4")).toBeInTheDocument();
    expect(screen.getByText("sessions.status.ACTIVE")).toBeInTheDocument();
  });

  it("offers a revoke button on an active session", () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [session()],
      count: 1,
      isLoading: false,
      isError: false,
    } as A);

    renderTable();

    expect(screen.getByText("sessions.revoke.label")).toBeInTheDocument();
  });

  it("hides the revoke button on a revoked session", () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [session({ id: "s2", status: "REVOKED" })],
      count: 1,
      isLoading: false,
      isError: false,
    } as A);

    renderTable();

    expect(screen.getByText("sessions.status.REVOKED")).toBeInTheDocument();
    expect(screen.queryByText("sessions.revoke.label")).toBeNull();
  });

  it("renders the empty state when the user has no sessions", () => {
    vi.mocked(useSessions).mockReturnValue({
      sessions: [],
      count: 0,
      isLoading: false,
      isError: false,
    } as A);

    renderTable();

    expect(screen.getByText("sessions.table.empty")).toBeInTheDocument();
  });
});
